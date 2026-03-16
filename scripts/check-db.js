// using --env-file to load env vars
const { createClient } = require('@supabase/supabase-js');

async function check() {
    console.log('--- CHECKING QBO CONNECTIONS ---');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: companies, error } = await supabase
        .from('quickbooks_clients')
        .select('id, name, is_active');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log(`Found ${companies.length} connected companies:`);
        companies.forEach(c => {
            console.log(`- [${c.id}] Name: "${c.name}" (Active: ${c.is_active})`);
        });
    }
}

check();
