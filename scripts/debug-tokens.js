// using --env-file to load env vars
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTokens() {
    console.log('Checking quickbooks_clients table...');
    const { data, error } = await supabase
        .from('quickbooks_clients')
        .select('id, name, is_active, created_at, expires_in, x_refresh_token_expires_in');

    if (error) {
        console.error('Error fetching tokens:', error);
        return;
    }

    if (!data || data.length === 0) {
        console.log('No tokens found in database.');
    } else {
        console.log(`Found ${data.length} records:`);
        data.forEach(row => {
            console.log('------------------------------------------------');
            console.log(`Company ID (RealmID): ${row.id}`);
            console.log(`Company Name: ${row.name}`);
            console.log(`Is Active: ${row.is_active}`);
            console.log(`Created At: ${row.created_at}`);
            console.log(`Token Expires In: ${row.expires_in}`);
            console.log('------------------------------------------------');
        });
    }
}

checkTokens();
