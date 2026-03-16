const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function migrate() {
    const env = fs.readFileSync('.env.local', 'utf8');
    const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
    const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();

    // We can't run raw SQL easily via the standard client without a custom RPC or using the PG connection string.
    // However, we can try to use the REST API to see if it works, or just tell the user to run the SQL.
    // Actually, Supabase doesn't allow DML/DDL via the standard API usually.

    console.log('Please run the following SQL in your Supabase SQL Editor:');
    console.log('ALTER TABLE public.quickbooks_clients ADD COLUMN IF NOT EXISTS client_email TEXT;');
    console.log('');
    console.log('-- Also run the RLS fix if you haven\'t already:');
    console.log('DROP POLICY IF EXISTS "Users can only access their own connections" ON public.quickbooks_clients;');
    console.log('CREATE POLICY "Allow all authenticated users to access QBO connections" ON public.quickbooks_clients FOR ALL USING (auth.role() = "authenticated");');
}

migrate();
