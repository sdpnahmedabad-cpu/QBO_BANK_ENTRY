// test-local-api.js
const { createClient } = require('@supabase/supabase-js');

async function testApi() {
    console.log('--- TESTING LOCAL API ENDPOINT ---');

    // 1. Get the company ID from DB first to be sure
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: companies } = await supabase.from('quickbooks_clients').select('id').eq('is_active', true);
    if (!companies || companies.length === 0) { console.log('No active company in DB'); return; }
    const companyId = companies[0].id;

    console.log(`Testing against Company ID: ${companyId}`);

    // 2. Fetch from localhost
    try {
        const res = await fetch(`http://localhost:3000/api/qbo/accounts?type=Bank&companyId=${companyId}`);
        console.log(`Status: ${res.status}`);

        if (res.ok) {
            const json = await res.json();
            console.log('Response Data Type:', Array.isArray(json) ? 'Array' : typeof json);
            console.log(JSON.stringify(json, null, 2));
        } else {
            console.log(await res.text());
        }
    } catch (e) {
        console.error('Request failed:', e.message);
    }
}

testApi();
