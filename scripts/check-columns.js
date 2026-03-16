const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function check() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
    const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

    const supabase = createClient(url, key);

    console.log('Checking quickbooks_clients columns...');
    const { data, error } = await supabase.from('quickbooks_clients').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Available columns:', Object.keys(data[0] || {}));
    }
}

check();
