// Check both tables
const { createClient } = require('@supabase/supabase-js');

async function checkBothTables() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('--- CHECKING RULES TABLE ---');
    const { data: rulesData, error: rulesError } = await supabase
        .from('rules')
        .select('*');

    if (rulesError) {
        console.log('Error:', rulesError.message);
    } else {
        console.log(`Found ${rulesData?.length || 0} rows in 'rules' table`);
        if (rulesData && rulesData.length > 0) {
            console.log('Sample:', JSON.stringify(rulesData[0], null, 2).substring(0, 300));
        }
    }

    console.log('\n--- CHECKING IMPORT_RULES TABLE ---');
    const { data: importRulesData, error: importRulesError } = await supabase
        .from('import_rules')
        .select('*');

    if (importRulesError) {
        console.log('Error:', importRulesError.message);
    } else {
        console.log(`Found ${importRulesData?.length || 0} rows in 'import_rules' table`);
        if (importRulesData && importRulesData.length > 0) {
            console.log('Sample:', JSON.stringify(importRulesData[0], null, 2).substring(0, 300));
        }
    }
}

checkBothTables();
