const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function main() {
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        console.error('Missing Environment Variables.');
        process.exit(1);
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // 1. Read dump file
    if (!fs.existsSync('rules_dump.json')) {
        console.error('rules_dump.json not found!');
        return;
    }

    const oldRules = JSON.parse(fs.readFileSync('rules_dump.json', 'utf8'));
    console.log(`Loaded ${oldRules.length} rules to migrate.`);

    let successCount = 0;
    let failCount = 0;

    for (const rule of oldRules) {
        const newRule = {
            client_id: rule.company_id,
            rule_name: rule.name,
            rule_type: rule.transaction_type,
            match_type: rule.match_type,
            conditions: rule.conditions,
            actions: {
                ledger: rule.ledger,
                contactId: rule.contact_id
            },
            is_active: true
        };

        const { error } = await supabase
            .from('import_rules')
            .insert(newRule);

        if (error) {
            console.error(`Failed to migrate rule "${rule.name}":`, error.message);
            failCount++;
        } else {
            console.log(`Migrated rule "${rule.name}" successfully.`);
            successCount++;
        }
    }

    console.log(`\nMigration Complete.`);
    console.log(`Success: ${successCount}`);
    console.log(`Failed: ${failCount}`);
}

main();
