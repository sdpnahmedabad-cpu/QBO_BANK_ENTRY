// test-api-detailed.js
const { createClient } = require('@supabase/supabase-js');

async function testApi() {
    console.log('--- DETAILED API TEST ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: companies } = await supabase.from('quickbooks_clients').select('id').eq('is_active', true);
    if (!companies || companies.length === 0) { console.log('No active company'); return; }
    const companyId = companies[0].id;

    console.log(`Company ID: ${companyId}`);

    try {
        const res = await fetch(`http://localhost:3000/api/qbo/accounts?type=Bank&companyId=${companyId}`);
        console.log(`Status: ${res.status}`);
        console.log(`Content-Type: ${res.headers.get('content-type')}`);

        const text = await res.text();
        console.log('\n--- RESPONSE BODY (first 500 chars) ---');
        console.log(text.substring(0, 500));
        console.log('\n--- END ---');

    } catch (e) {
        console.error('Request failed:', e.message);
    }
}

testApi();
