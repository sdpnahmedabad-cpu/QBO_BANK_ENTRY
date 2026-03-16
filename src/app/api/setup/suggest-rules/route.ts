import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { qboClient } from '@/lib/qbo';

export async function GET(request: Request) {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!companyId || !startDate || !endDate) {
        return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    try {
        // 1. Fetch Purchases
        const purchaseQuery = `SELECT * FROM Purchase WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`;
        const purchasesRes = await qboClient.query(supabase, companyId, purchaseQuery);
        const purchases = purchasesRes?.QueryResponse?.Purchase || [];

        // 2. Fetch Deposits
        const depositQuery = `SELECT * FROM Deposit WHERE TxnDate >= '${startDate}' AND TxnDate <= '${endDate}' MAXRESULTS 1000`;
        const depositsRes = await qboClient.query(supabase, companyId, depositQuery);
        const deposits = depositsRes?.QueryResponse?.Deposit || [];

        // 3. Generate Suggestions
        const suggestionsMap = new Map();

        // Process Purchases
        purchases.forEach((p: any) => {
            const payee = p.EntityRef?.name || p.Line?.[0]?.Description || 'Unknown Payee';
            const account = p.AccountRef?.name || p.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.name;
            const accountId = p.AccountRef?.value || p.Line?.[0]?.AccountBasedExpenseLineDetail?.AccountRef?.value;

            if (payee && account && !suggestionsMap.has(payee)) {
                suggestionsMap.set(payee, {
                    rule_name: `Rule for ${payee}`,
                    rule_type: 'Expense',
                    match_type: 'AND',
                    conditions: [{ field: 'Description', operator: 'contains', value: payee }],
                    actions: {
                        ledger: account,
                        contactId: p.EntityRef?.value
                    },
                    count: 1
                });
            } else if (suggestionsMap.has(payee)) {
                suggestionsMap.get(payee).count++;
            }
        });

        // Process Deposits
        deposits.forEach((d: any) => {
            const payee = d.EntityRef?.name || d.Line?.[0]?.Description || 'Unknown Source';
            const account = d.DepositToAccountRef?.name || d.Line?.[0]?.DepositLineDetail?.AccountRef?.name;
            const accountId = d.DepositToAccountRef?.value || d.Line?.[0]?.DepositLineDetail?.AccountRef?.value;

            if (payee && account && !suggestionsMap.has(payee)) {
                suggestionsMap.set(payee, {
                    rule_name: `Rule for ${payee}`,
                    rule_type: 'Income',
                    match_type: 'AND',
                    conditions: [{ field: 'Description', operator: 'contains', value: payee }],
                    actions: {
                        ledger: account,
                        contactId: d.EntityRef?.value
                    },
                    count: 1
                });
            } else if (suggestionsMap.has(payee)) {
                suggestionsMap.get(payee).count++;
            }
        });

        const suggestions = Array.from(suggestionsMap.values());
        return NextResponse.json(suggestions);
    } catch (error: any) {
        console.error('Suggest Rules Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
