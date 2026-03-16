import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
