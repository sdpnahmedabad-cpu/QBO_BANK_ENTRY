import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    const supabase = await createClient();
    try {
        const body = await request.json();
        const { companyId, transactions } = body;

        if (!companyId || !transactions || !Array.isArray(transactions)) {
            return NextResponse.json({ error: 'Invalid request. Company ID and transactions array required.' }, { status: 400 });
        }

        // Fetch ONLY active rules for THIS company, most recent first
        console.log(`[ApplyRules] Fetching active rules for client_id: ${companyId}`);
        const { data: rulesData, error } = await supabase
            .from('import_rules')
            .select('*')
            .eq('client_id', companyId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Rules FETCH error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const rules = rulesData || [];
        console.log(`[ApplyRules] Found ${rules.length} active rules.`);

        // Apply rules
        let hasChanges = false;
        const mappedTransactions = transactions.map(row => {
            // Skip if already mapped manually
            if (row.rule_applied && row.rule_applied === "Manual") return row;

            // Try to find a matching rule
            for (const rule of rules) {
                const conditions = rule.conditions as any[];
                if (!conditions || conditions.length === 0) continue;

                const matchType = rule.match_type || 'AND';

                const conditionResults = conditions.map((cond: any) => {
                    // Find the field in the row case-insensitively
                    const fieldKey = Object.keys(row).find(k => k.toLowerCase() === cond.field.toLowerCase());
                    const rowValue = fieldKey ? (row[fieldKey]?.toString().toLowerCase() || "") : "";
                    const ruleValue = cond.value?.toLowerCase() || "";

                    switch (cond.operator) {
                        case 'contains': return rowValue.includes(ruleValue);
                        case 'not_contains': return !rowValue.includes(ruleValue);
                        case 'equals': return rowValue === ruleValue;
                        case 'starts_with': return rowValue.startsWith(ruleValue);
                        case 'ends_with': return rowValue.endsWith(ruleValue);
                        case 'gt': return parseFloat(rowValue) > parseFloat(ruleValue);
                        case 'lt': return parseFloat(rowValue) < parseFloat(ruleValue);
                        case 'gte': return parseFloat(rowValue) >= parseFloat(ruleValue);
                        case 'lte': return parseFloat(rowValue) <= parseFloat(ruleValue);
                        default: return false;
                    }
                });

                const isMatch = matchType === 'OR'
                    ? conditionResults.some(res => res)
                    : conditionResults.every(res => res);

                if (isMatch) {
                    hasChanges = true;
                    return {
                        ...row,
                        rule_applied: rule.rule_name,
                        suggested_ledger: rule.actions?.ledger,
                        suggested_type: rule.rule_type,
                        suggested_contact_id: rule.actions?.contactId
                    };
                }
            }
            return row;
        });

        return NextResponse.json({ transactions: mappedTransactions, applied: hasChanges });

    } catch (e) {
        console.error("Error applying rules:", e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
