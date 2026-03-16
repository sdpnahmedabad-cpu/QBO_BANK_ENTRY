// using --env-file to load env vars
const { createClient } = require('@supabase/supabase-js');

async function reset() {
    console.log('--- FACTORY RESET: QBO INTEGRATION ---');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Delete all connections
    const { error } = await supabase
        .from('quickbooks_clients')
        .delete()
        .neq('id', '0'); // Delete everything

    if (error) {
        console.error('Reset failed:', error);
    } else {
        console.log('SUCCESS: All QuickBooks connections have been cleared.');
        console.log('The application is now in a fresh, disconnected state.');
    }
}

reset();
