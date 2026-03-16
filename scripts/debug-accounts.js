// using --env-file to load env vars
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

async function debugAccounts() {
    console.log('--- DEBUGGING ACCOUNTS WITH INTUIT OAUTH CLIENT ---');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientId = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
    const clientSecret = process.env.QBO_CLIENT_SECRET;
    const environment = process.env.NEXT_PUBLIC_QBO_ENVIRONMENT || 'sandbox';

    if (!supabaseUrl || !supabaseKey) { console.error('Missing credentials'); return; }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Get the token
    const { data: companies } = await supabase.from('quickbooks_clients').select('*').eq('is_active', true);

    if (!companies || companies.length === 0) {
        console.log("No connected companies found.");
        return;
    }

    const company = companies[0];
    console.log(`Checking Company: ${company.name} (${company.id})`);

    // Setup OAuth Client
    const oauthClient = new OAuthClient({
        clientId: clientId,
        clientSecret: clientSecret,
        environment: environment,
        redirectUri: 'http://localhost:3000/api/auth/qbo/callback'
    });

    // Load tokens
    // We assume the DB columns match what we need or we pass them in.
    // intuit-oauth usage: client.setToken(token_obj)
    oauthClient.setToken({
        access_token: company.access_token,
        refresh_token: company.refresh_token,
        realmId: company.id,
        token_type: 'bearer',
        expires_in: company.expires_in,
        x_refresh_token_expires_in: company.x_refresh_token_expires_in,
        // Optional: latency is handled by library usually but we can pass creation time if needed
        createdAt: new Date(company.updated_at || company.created_at).getTime()
    });

    if (!oauthClient.isAccessTokenValid()) {
        console.log("Access Token Expired. Refreshing...");
        try {
            const authResponse = await oauthClient.refresh();
            console.log("Token Refreshed!");
            // Save to DB
            const newTokens = authResponse.getJson();

            console.log("Tokens received from Intuit:", Object.keys(newTokens));

            // Update DB
            // console.log("Skipping DB update to verify QBO connection first.");

            const { error } = await supabase.from('quickbooks_clients')
                .update({
                    access_token: newTokens.access_token,
                    refresh_token: newTokens.refresh_token,
                    expires_in: newTokens.expires_in,
                    x_refresh_token_expires_in: newTokens.x_refresh_token_expires_in,
                    updated_at: new Date().toISOString()
                })
                .eq('id', company.id);

            if (error) {
                console.error("Error updating DB:", JSON.stringify(error, null, 2));
            } else {
                console.log("Tokens updated in DB.");
            }

        } catch (e) {
            console.error("Refresh failed:", e);
            if (e.driver_error) console.error("Original Error:", JSON.stringify(e.driver_error, null, 2));
            return;
        }
    } else {
        console.log("Token is valid.");
    }

    // 2. Make Request
    console.log("Preparing to query QBO...");
    const query = "select * from Account where AccountType='Bank' maxresults 10";
    const encodedQuery = encodeURIComponent(query);
    const url = `${environment === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com'}/v3/company/${company.id}/query?query=${encodedQuery}&minorversion=65`;

    console.log(`Fetching: ${url}`);

    // Use manual fetch to avoid library issues
    try {
        const token = oauthClient.getToken().access_token;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Status: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.error('Body:', text);
            return;
        }

        const data = await response.json();
        console.log('--- RESPONSE ---');
        if (data.QueryResponse && data.QueryResponse.Account) {
            console.log(`Found ${data.QueryResponse.Account.length} accounts.`);
            data.QueryResponse.Account.forEach(acc => {
                console.log(`- [${acc.Id}] ${acc.Name} (Type: ${acc.AccountType}, SubType: ${acc.AccountSubType})`);
            });
        } else {
            console.log("QueryResponse is empty or has no accounts.");
            console.log(JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error("API Call Failed:", e);
    }
}

debugAccounts();
