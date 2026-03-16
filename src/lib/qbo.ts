import OAuthClient from 'intuit-oauth';
import { tokenStorage } from './token-storage';

const getClient = () => {
    const environment = process.env.NEXT_PUBLIC_QBO_ENVIRONMENT || 'sandbox';
    const redirectUri = process.env.NEXT_PUBLIC_QBO_REDIRECT_URI || 'http://localhost:3000/api/auth/qbo/callback';

    // Explicit logging for debugging connection issues
    console.log(`[QBO Client] Initializing in ${environment.toUpperCase()} mode`);
    console.log(`[QBO Client] Redirect URI: ${redirectUri}`);

    return new OAuthClient({
        clientId: process.env.NEXT_PUBLIC_QBO_CLIENT_ID || 'PLACEHOLDER',
        clientSecret: process.env.QBO_CLIENT_SECRET || 'PLACEHOLDER',
        environment: environment,
        redirectUri: redirectUri,
    });
};

const getBaseUrl = (client: any) => {
    return client.environment === 'sandbox'
        ? 'https://sandbox-quickbooks.api.intuit.com/'
        : 'https://quickbooks.api.intuit.com/';
};

const extractJson = async (response: any) => {
    console.log('[QBO] extractJson - response type:', typeof response);
    console.log('[QBO] extractJson - response keys:', Object.keys(response || {}).join(', '));
    console.log('[QBO] extractJson - has getJson:', typeof response?.getJson);
    console.log('[QBO] extractJson - has json:', typeof response?.json);
    console.log('[QBO] extractJson - has body:', typeof response?.body);

    if (typeof response?.getJson === 'function') {
        const result = response.getJson();
        console.log('[QBO] Used getJson(), result type:', typeof result);
        return result;
    }
    if (typeof response?.json === 'function') {
        const result = await response.json();
        console.log('[QBO] Used json(), result type:', typeof result);
        return result;
    }
    // Check if response.json is already the parsed data (not a function)
    if (response?.json && typeof response.json === 'object') {
        console.log('[QBO] response.json is an object, using it directly');
        return response.json;
    }
    // Fallback if it's already an object
    console.log('[QBO] Using fallback - response.data or response');
    return response.data || response;
};

const checkConnectivity = async () => {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        await fetch('https://oauth.platform.intuit.com/op/v1/token', {
            method: 'HEAD',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return true;
    } catch (e: any) {
        console.warn('Connectivity Check Warning:', e.message);
        return false;
    }
};

export const qboClient = {
    getAuthUri: () => {
        const client = getClient();
        return client.authorizeUri({
            scope: [OAuthClient.scopes.Accounting, OAuthClient.scopes.OpenId],
            state: 'security_token',
        });
    },

    createToken: async (supabase: any, url: string) => {
        const client = getClient();
        try {
            console.log('QBO: Attempting to create token with URL:', url);
            const isConnected = await checkConnectivity();
            if (!isConnected) {
                console.warn('QBO: Connectivity check to Intuit failed before creating token. Proceeding anyway...');
            }

            const authResponse = await client.createToken(url);
            console.log('QBO: Token created successfully for realmId:', authResponse.token.realmId);

            // tokenStorage.save will now handle getting the user and saving it with the realmId
            await tokenStorage.save(supabase, authResponse.getJson(), authResponse.token.realmId);
            return authResponse.getJson();
        } catch (error: any) {
            console.error('QBO Create Token Error:', error.message);
            if (error.message.includes('ENOTFOUND')) {
                console.error('CRITICAL: DNS Resolution failed for oauth.platform.intuit.com. Please check network/DNS settings.');
            }
            throw error;
        }
    },

    ensureAuthenticated: async (supabase: any, realmId?: string) => {
        let tokens = await tokenStorage.load(supabase, realmId);
        if (!tokens) return null;

        const client = getClient();
        client.setToken(tokens);

        if (!client.isAccessTokenValid()) {
            try {
                const authResponse = await client.refresh();
                await tokenStorage.save(supabase, authResponse.getJson(), tokens.realmId, tokens.companyName);
                return client;
            } catch (e) {
                console.error('Token Refresh Failed', e);
                return null;
            }
        }
        return client;
    },

    getConnectedCompanies: async (supabase: any, includeInactive = false) => {
        return await tokenStorage.getCompanies(supabase, includeInactive);
    },

    // Preferred method: Query the CompanyInfo table directly (more reliable than UserInfo)
    getCompanyInfoQuery: async (supabase: any, realmId?: string) => {
        const res = await qboClient.query(supabase, realmId, "SELECT * FROM CompanyInfo");
        return res?.QueryResponse?.CompanyInfo?.[0] || null;
    },

    getCompanyInfo: async (supabase: any, realmId?: string) => {
        const client = await qboClient.ensureAuthenticated(supabase, realmId);
        if (!client) throw new Error("Not authenticated");

        try {
            const url = `https://${client.environment === 'sandbox' ? 'sandbox-accounts' : 'accounts'}.platform.intuit.com/v1/openid_connect/userinfo`;
            console.log('QBO: Fetching company info from:', url);
            const response = await client.makeApiCall({ url });
            return await extractJson(response);
        } catch (error: any) {
            console.error('Error fetching company info:', error.message || error);
            const tokens = await tokenStorage.load(supabase, realmId);
            return { companyName: tokens?.companyName || 'QuickBooks Company' };
        }
    },

    // --- Query Methods ---

    query: async (supabase: any, realmId: string | undefined, query: string) => {
        let client: any;
        let url: string = "";

        try {
            client = await qboClient.ensureAuthenticated(supabase, realmId);
            if (!client) throw new Error("Not authenticated");

            url = `${getBaseUrl(client)}v3/company/${realmId || client.getToken().realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;
            console.log(`[QBO] Executing query: ${query}`);
            console.log(`[QBO] URL: ${url}`);

            const response = await client.makeApiCall({ url });
            const result = await extractJson(response);

            console.log(`[QBO] Query result:`, JSON.stringify(result).substring(0, 200));
            return result;
        } catch (error: any) {
            console.error(`[QBO] Query failed:`, error.message);
            console.error(`[QBO] Query Stack:`, error.stack);
            console.error(`[QBO] Query was: ${query}`);

            // Retry logic for Connection reset
            if (error.message && error.message.includes('Connection reset') && client && url) {
                console.warn('[QBO] Retrying query due to connection reset...');
                try {
                    const response = await client.makeApiCall({ url });
                    return await extractJson(response);
                } catch (retryError: any) {
                    console.error('[QBO] Retry failed:', retryError.message);
                    throw retryError;
                }
            }
            throw error;
        }
    },

    getBankAccounts: async (supabase: any, realmId?: string) => {
        console.log(`[QBO] getBankAccounts called for realmId: ${realmId}`);

        // Direct API call instead of using query method
        const client = await qboClient.ensureAuthenticated(supabase, realmId);
        if (!client) throw new Error("Not authenticated");

        const url = `${getBaseUrl(client)}v3/company/${realmId || client.getToken().realmId}/query?query=${encodeURIComponent("SELECT * FROM Account WHERE AccountType='Bank' MAXRESULTS 1000")}&minorversion=65`;
        console.log(`[QBO] Direct URL: ${url}`);

        const response = await client.makeApiCall({ url });
        const result = await extractJson(response);

        console.log(`[QBO] Raw result:`, JSON.stringify(result).substring(0, 300));

        const allAccounts = result?.QueryResponse?.Account || [];
        console.log(`[QBO] Found ${allAccounts.length} bank accounts from direct call`);

        return allAccounts;
    },

    getChartOfAccounts: async (supabase: any, realmId?: string) => {
        const res = await qboClient.query(supabase, realmId, "SELECT * FROM Account MAXRESULTS 1000");
        return res?.QueryResponse?.Account || [];
    },

    getVendors: async (supabase: any, realmId?: string) => {
        const res = await qboClient.query(supabase, realmId, "SELECT * FROM Vendor MAXRESULTS 1000");
        return res?.QueryResponse?.Vendor || [];
    },

    getCustomers: async (supabase: any, realmId?: string) => {
        const res = await qboClient.query(supabase, realmId, "SELECT * FROM Customer MAXRESULTS 1000");
        return res?.QueryResponse?.Customer || [];
    },

    getTransactions: async (supabase: any, realmId: string, accountId: string, startDate: string, endDate: string) => {
        const query = `SELECT * FROM Purchase WHERE AccountRef = '${accountId}' AND TxnDate >= '${startDate}' AND TxnDate <= '${endDate}'`;
        const res = await qboClient.query(supabase, realmId, query);
        return res?.QueryResponse?.Purchase || [];
    },

    // --- CRUD Methods ---

    createEntity: async (supabase: any, entityName: string, data: any, realmId?: string) => {
        const client = await qboClient.ensureAuthenticated(supabase, realmId);
        if (!client) throw new Error("Not authenticated");

        const url = `${getBaseUrl(client)}v3/company/${realmId || client.getToken().realmId}/${entityName.toLowerCase()}?minorversion=65`;
        const response = await client.makeApiCall({
            url,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await extractJson(response);
    },

    createPurchase: async (supabase: any, data: any, realmId?: string) => {
        return await qboClient.createEntity(supabase, 'Purchase', data, realmId);
    },

    createDeposit: async (supabase: any, data: any, realmId?: string) => {
        return await qboClient.createEntity(supabase, 'Deposit', data, realmId);
    },

    createTransfer: async (supabase: any, data: any, realmId?: string) => {
        return await qboClient.createEntity(supabase, 'Transfer', data, realmId);
    },

    // --- Report Methods ---

    getReport: async (supabase: any, reportName: string, params: any = {}, realmId?: string) => {
        const client = await qboClient.ensureAuthenticated(supabase, realmId);
        if (!client) throw new Error("Not authenticated");

        let url = `${getBaseUrl(client)}v3/company/${realmId || client.getToken().realmId}/reports/${reportName}?minorversion=65`;
        Object.entries(params).forEach(([key, value]) => {
            if (value) url += `&${key}=${value}`;
        });

        console.log(`[QBO] getReport - Generated URL: ${url}`);

        const response = await client.makeApiCall({ url });
        return await extractJson(response);
    },

    getProfitAndLoss: async (supabase: any, startDate?: string, endDate?: string, realmId?: string, params: any = {}) => {
        return await qboClient.getReport(supabase, 'ProfitAndLoss', { start_date: startDate, end_date: endDate, ...params }, realmId);
    },

    getBalanceSheet: async (supabase: any, date?: string, realmId?: string) => {
        return await qboClient.getReport(supabase, 'BalanceSheet', { report_date: date }, realmId);
    },

    CashFlow: async (supabase: any, startDate?: string, endDate?: string, realmId?: string) => {
        return await qboClient.getReport(supabase, 'CashFlow', { start_date: startDate, end_date: endDate }, realmId);
    },

    getAgedPayables: async (supabase: any, date?: string, realmId?: string) => {
        return await qboClient.getReport(supabase, 'AgedPayables', { report_date: date, aging_method: 'Report_Date' }, realmId);
    },

    getAgedReceivables: async (supabase: any, date?: string, realmId?: string) => {
        return await qboClient.getReport(supabase, 'AgedReceivables', { report_date: date, aging_method: 'Report_Date' }, realmId);
    }
};
