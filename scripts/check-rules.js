// Check what rules exist in the database
const { createClient } = require('@supabase/supabase-js');

async function checkRules() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- CHECKING RULES DATABASE ---\n');

    // Get all rules
    const { data: rules, error } = await supabase
        .from('rules')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching rules:', error);
        return;
    }

    console.log(`Found ${rules?.length || 0} rules in database:\n`);

    if (rules && rules.length > 0) {
        rules.forEach((rule, index) => {
            console.log(`${index + 1}. Rule: ${rule.name || rule.id}`);
            console.log(`   ID: ${rule.id}`);
            console.log(`   Company ID: ${rule.company_id || 'N/A'}`);
            console.log(`   Created: ${rule.created_at}`);
            console.log(`   Conditions: ${JSON.stringify(rule.conditions || {})}`);
            console.log(`   Actions: ${JSON.stringify(rule.actions || {})}`);
            console.log('');
        });
    } else {
        console.log('No rules found in database.');
    }

    // Check if there's a company_id column
    const { data: columns } = await supabase
        .from('rules')
        .select('*')
        .limit(1);

    if (columns && columns.length > 0) {
        console.log('\nTable columns:', Object.keys(columns[0]).join(', '));
    }
}

checkRules().catch(console.error);
