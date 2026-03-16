// debug-profit-loss.js
const { createClient } = require('@supabase/supabase-js');
const OAuthClient = require('intuit-oauth');

async function debugProfitLoss() {
    console.log('--- DEBUGGING PROFIT AND LOSS REPORT ---');
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
    console.log(`Using Company: ${company.name} (${company.id})`);

    // Setup OAuth Client (reuse valid token logic from debug-accounts.js ideally, but keep simple here)
    const oauthClient = new OAuthClient({
        clientId: clientId,
        clientSecret: clientSecret,
        environment: environment,
        redirectUri: 'http://localhost:3000/api/auth/qbo/callback'
    });

    // Note: In a real scenario, we should refresh the token if needed. 
    // For this debug script, existing valid tokens or a quick refresh call is assumed sufficient or we can duplicate the refresh logic.
    // Let's just try to use the access token. If it fails, we know we need to run debug-accounts.js first.

    const urlBase = environment === 'sandbox' ? 'https://sandbox-quickbooks.api.intuit.com' : 'https://quickbooks.api.intuit.com';

    // Calculate dates
    const today = new Date();
    const lastYear = new Date(today);
    lastYear.setMonth(today.getMonth() - 11);
    lastYear.setDate(1);

    const startDate = lastYear.toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];

    console.log(`Date Range: ${startDate} to ${endDate}`);

    const url = `${urlBase}/v3/company/${company.id}/reports/ProfitAndLoss?start_date=${startDate}&end_date=${endDate}&summarize_column_by=Month&minorversion=65`;
    console.log(`Fetching URL: ${url}`);

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${company.access_token}`, // Use stored token
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Error: ${response.status} ${response.statusText}`);
            console.log(await response.text());
            return;
        }

        const data = await response.json();
        console.log('--- REPORT STRUCTURE ---');
        console.log('Columns:', JSON.stringify(data.Columns, null, 2));

        // Dump a bit of rows to see structure
        if (data.Rows && data.Rows.Row) {
            console.log('--- ROWS SAMPLE ---');
            console.log(JSON.stringify(data.Rows.Row.slice(0, 5), null, 2));

            // Try to find Totals
            const traverse = (rows, name) => {
                for (const row of rows) {
                    if (row.Summary && row.Summary.ColData && row.Summary.ColData[0]?.value === name) return row.Summary;
                    if (row.group && row.Summary && row.Summary.ColData && row.Summary.ColData[0]?.value === name) return row.Summary; // some structures
                    if (row.Rows && row.Rows.Row) {
                        const found = traverse(row.Rows.Row, name);
                        if (found) return found;
                    }
                }
                return null;
            };

            const inc = traverse(data.Rows.Row, 'Total Income');
            const exp = traverse(data.Rows.Row, 'Total Expenses');

            console.log('\n--- FOUND TOTALS ---');
            console.log('Total Income Row:', JSON.stringify(inc, null, 2));
            console.log('Total Expenses Row:', JSON.stringify(exp, null, 2));
        } else {
            console.log('No rows found.');
        }

    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

debugProfitLoss();
