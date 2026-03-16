// check-token-validity.js
const { createClient } = require('@supabase/supabase-js');

async function checkToken() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: companies } = await supabase
        .from('quickbooks_clients')
        .select('*')
        .eq('is_active', true);

    if (!companies || companies.length === 0) {
        console.log('No active companies found');
        return;
    }

    console.log(`Found ${companies.length} active company(ies):`);

    for (const company of companies) {
        console.log(`\n--- Company: ${company.name} (${company.id}) ---`);
        console.log(`Created: ${company.created_at}`);
        console.log(`Token expires_in: ${company.expires_in} seconds`);
        console.log(`Refresh token expires_in: ${company.x_refresh_token_expires_in} seconds`);

        // Check if access token is expired (rough estimate)
        const createdDate = new Date(company.created_at);
        const now = new Date();
        const ageInSeconds = (now - createdDate) / 1000;

        console.log(`Token age: ${Math.floor(ageInSeconds)} seconds`);
        console.log(`Access token expired: ${ageInSeconds > company.expires_in ? 'YES' : 'NO'}`);
        console.log(`Refresh token expired: ${ageInSeconds > company.x_refresh_token_expires_in ? 'YES' : 'NO'}`);

        // Try to query QBO directly
        const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${company.id}/query?query=select * from Account where AccountType='Bank' maxresults 10&minorversion=65`;

        try {
            const res = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${company.access_token}`,
                    'Accept': 'application/json'
                }
            });

            console.log(`\nDirect QBO API test: ${res.status} ${res.statusText}`);

            if (res.ok) {
                const data = await res.json();
                const accounts = data.QueryResponse?.Account || [];
                console.log(`Found ${accounts.length} bank accounts`);
                if (accounts.length > 0) {
                    accounts.forEach(acc => console.log(`  - ${acc.Name} (${acc.Id})`));
                }
            } else {
                const errorText = await res.text();
                console.log(`Error: ${errorText.substring(0, 200)}`);
            }
        } catch (e) {
            console.error(`Fetch failed: ${e.message}`);
        }
    }
}

checkToken();
