const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

// Read .env.local manually
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim();
    }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRoles() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('email, role');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log('User Profiles and Roles:');
    console.table(profiles);
}

checkRoles();
