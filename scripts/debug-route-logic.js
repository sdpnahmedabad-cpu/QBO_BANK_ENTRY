// debug-route-logic.js
const { createClient: createSupabase } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

async function debugRouteLogic() {
    console.log('--- DEBUGGING ROUTE LOGIC ---');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const clientId = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
    const clientSecret = process.env.QBO_CLIENT_SECRET;
    const environment = process.env.NEXT_PUBLIC_QBO_ENVIRONMENT || 'sandbox';

    if (!supabaseUrl || !supabaseKey) { console.error('Missing credentials'); return; }

    const supabase = createSupabase(supabaseUrl, supabaseKey);

    // 1. Get the token
    const { data: companies } = await supabase.from('quickbooks_clients').select('*').eq('is_active', true);
    if (!companies || companies.length === 0) { console.log("No connected companies found."); return; }
    const company = companies[0];

    // 2. Setup Client
    const oauthClient = new OAuthClient({
        clientId, clientSecret, environment,
        redirectUri: 'http://localhost:3000/api/auth/qbo/callback'
    });

    oauthClient.setToken({
        access_token: company.access_token,
        refresh_token: company.refresh_token,
        realmId: company.id,
        token_type: 'bearer',
        expires_in: company.expires_in,
        x_refresh_token_expires_in: company.x_refresh_token_expires_in,
        createdAt: new Date(company.updated_at || company.created_at).getTime()
    });

    // Refresh if needed (simplified)
    if (!oauthClient.isAccessTokenValid()) {
        try {
            console.log("Refreshing token...");
            await oauthClient.refresh();
            // In real app we save back to DB, here just proceed in memory
        } catch (e) { console.error("Refresh failed", e); return; }
    }

    // 3. Construct URL matches qbo.ts logic
    // getBaseUrl(client) + `v3/company/${realmId}/reports/${reportName}?minorversion=65`
    // params: { start_date, end_date, ...params }

    const today = new Date();
    const lastYear = new Date(today);
    lastYear.setMonth(today.getMonth() - 11);
    lastYear.setDate(1);
    const startDate = lastYear.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    const summarize_column_by = 'Month';

    let url = environment === 'sandbox'
        ? 'https://sandbox-quickbooks.api.intuit.com/'
        : 'https://quickbooks.api.intuit.com/';

    url += `v3/company/${company.id}/reports/ProfitAndLoss?minorversion=65`;

    // logic from qbo.ts:
    // Object.entries(params).forEach(([key, value]) => { if (value) url += `&${key}=${value}`; });
    const params = { start_date: startDate, end_date: endDate, summarize_column_by };
    Object.entries(params).forEach(([key, value]) => {
        if (value) url += `&${key}=${value}`;
    });

    console.log(`Constructed URL: ${url}`);

    try {
        const response = await oauthClient.makeApiCall({ url });
        console.log("Status:", response.response.status); // User reported !res.ok in frontend, so status != 200

        // Parsed body
        const json = response.getJson();
        if (json.Fault) {
            console.error("API Fault:", JSON.stringify(json.Fault, null, 2));
        } else {
            console.log("Success! Rows length:", json?.Rows?.Row?.length);
        }
    } catch (e) {
        console.error("API Call Failed");
        console.error("Error Message:", e.message);
        if (e.response) {
            console.error("Response Status:", e.response.status);
            console.error("Response Headers:", JSON.stringify(e.response.headers, null, 2));
            console.error("Response Body:", typeof e.response.body === 'object' ? JSON.stringify(e.response.body, null, 2) : e.response.body);
            console.error("Response Text:", await e.response.text?.());
        } else {
            console.error("No response object. Full Error:", JSON.stringify(e, Object.getOwnPropertyNames(e), 2));
        }
        if (e.authResponse) {
            console.error("Auth Response:", JSON.stringify(e.authResponse, null, 2));
        }
        // console.error("Full Error:", e);
    }
}

debugRouteLogic();
