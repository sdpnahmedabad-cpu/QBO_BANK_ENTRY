const OAuthClient = require('intuit-oauth');
const { createClient } = require('@supabase/supabase-js');

// Helper to sleep/wait
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
    // 1. Load Env Vars
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const QBO_CLIENT_ID = process.env.NEXT_PUBLIC_QBO_CLIENT_ID;
    const QBO_CLIENT_SECRET = process.env.QBO_CLIENT_SECRET;
    const QBO_ENV = process.env.NEXT_PUBLIC_QBO_ENVIRONMENT || 'sandbox';

    if (!SUPABASE_URL || !SUPABASE_KEY || !QBO_CLIENT_ID || !QBO_CLIENT_SECRET) {
        console.error('Missing Environment Variables. Make sure to run with --env-file=.env.local');
        process.exit(1);
    }

    console.log('Environment:', QBO_ENV);

    // 2. Connect to Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 3. Get first active company
    console.log('Fetching active company from Supabase...');
    const { data: companies, error } = await supabase
        .from('quickbooks_clients')
        .select('*')
        .eq('is_active', true)
        .limit(1);

    if (error || !companies || companies.length === 0) {
        console.error('No active company found or error fetching:', error);
        return;
    }

    const company = companies[0];
    console.log(`Testing with Company: ${company.name} (RealmID: ${company.id})`);

    // 4. Setup OAuth Client
    const client = new OAuthClient({
        clientId: QBO_CLIENT_ID,
        clientSecret: QBO_CLIENT_SECRET,
        environment: QBO_ENV,
        redirectUri: 'http://localhost:3000/api/auth/qbo/callback', // Doesn't matter for query
    });

    // 5. Set Token
    const tokens = {
        realmId: company.id,
        access_token: company.access_token,
        refresh_token: company.refresh_token,
        expires_in: company.expires_in,
        x_refresh_token_expires_in: company.x_refresh_token_expires_in,
        latency: 60, // default
        token_type: 'bearer'
    };

    client.setToken(tokens);

    // 6. Refresh if needed
    if (!client.isAccessTokenValid()) {
        console.log('Access token expired. Refreshing...');
        try {
            const authResponse = await client.refresh();
            console.log('Refreshed successfully.');
            // Update in DB (Optional for this test, but good practice)
            await supabase
                .from('quickbooks_clients')
                .update({
                    access_token: authResponse.token.access_token,
                    refresh_token: authResponse.token.refresh_token,
                    expires_in: authResponse.token.expires_in,
                    x_refresh_token_expires_in: authResponse.token.x_refresh_token_expires_in,
                    updated_at: new Date().toISOString()
                })
                .eq('id', company.id);
        } catch (e) {
            console.error('Failed to refresh token:', e.originalMessage || e.message);
            return;
        }
    }

    // 7. Execute Query
    const query = "SELECT * FROM CompanyInfo";
    const realmId = client.getToken().realmId;
    const url = client.environment === 'sandbox'
        ? `https://sandbox-quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`
        : `https://quickbooks.api.intuit.com/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=65`;

    console.log(`Executing Query: ${query}`);
    console.log(`URL: ${url}`);

    try {
        const response = await client.makeApiCall({ url });
        console.log('API Call Resolved.');

        let json;
        // logic from qbo.ts extractJson
        if (typeof response.getJson === 'function') {
            console.log('Using .getJson()');
            json = response.getJson();
        } else if (response.json) {
            console.log('Using .json (property or function)');
            json = typeof response.json === 'function' ? await response.json() : response.json;
        } else {
            console.log('Using raw response');
            json = response;
        }

        const fs = require('fs');
        fs.writeFileSync('result.json', JSON.stringify(json, null, 2));
        console.log('Company Info Result written to result.json');
    } catch (e) {
        const fs = require('fs');
        const errorData = {
            message: e.message,
            code: e.code,
            stack: e.stack,
            responseBody: e.response ? e.response.body : 'No response body',
            originalMessage: e.originalMessage
        };
        fs.writeFileSync('error.json', JSON.stringify(errorData, null, 2));
        console.log('Error written to error.json');
    }
}

main();
