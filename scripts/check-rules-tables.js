const { createClient } = require('@supabase/supabase-js');

async function main() {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('Missing Environment Variables.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const fs = require('fs');
    console.log('--- Checking table: rules ---');
    const { data: rulesData, error: rulesError } = await supabase
        .from('rules')
        .select('*');

    if (rulesError) {
        console.log('Error reading "rules" table:', rulesError.message);
        fs.writeFileSync('rules_error.txt', rulesError.message);
    } else {
        console.log(`Found ${rulesData.length} records in "rules" table.`);
        fs.writeFileSync('rules_dump.json', JSON.stringify(rulesData, null, 2));
    }

    console.log('\n--- Checking table: import_rules ---');
    const { data: importRulesData, error: importRulesError } = await supabase
        .from('import_rules')
        .select('*');

    if (importRulesError) {
        console.log('Error reading "import_rules" table:', importRulesError.message);
        fs.writeFileSync('import_rules_error.txt', importRulesError.message);
    } else {
        console.log(`Found ${importRulesData.length} records in "import_rules" table.`);
        fs.writeFileSync('import_rules_dump.json', JSON.stringify(importRulesData, null, 2));
    }
}

main();
