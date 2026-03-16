import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { verifyApiKey } from '@/lib/api-auth';

/**
 * Public API for 3rd parties to push bank transactions directly into Finza.
 * 
 * Header Required:
 * x-api-key: finza_live_xxxx
 * 
 * JSON Body:
 * {
 *   "transactions": [
 *     {
 *       "date": "YYYY-MM-DD",
 *       "description": "Starbucks Coffee",
 *       "debit": 15.50,
 *       "credit": 0,
 *       "balance": 1000.00
 *     }
 *   ]
 * }
 */
export async function POST(request: Request) {
    try {
        // 1. Authenticate via API Key
        const companyId = await verifyApiKey(request);

        // 2. Parse Body
        const body = await request.json();

        // n8n might send the array directly or wrapped in an object
        const transactions = Array.isArray(body) ? body : (body.transactions || body.data || []);

        if (transactions.length === 0) {
            return NextResponse.json({
                error: 'No transactions found in request body.',
                suggestion: 'Ensure you are sending an array of objects, or an object with a "transactions" key.'
            }, { status: 400 });
        }

        const supabase = await createClient();

        // 3. Prepare data for bank_entries table
        // We'll be flexible with field names to make n8n mapping easier
        const entriesToInsert = transactions.map((tx: any, index: number) => {
            const date = tx.date || tx.transaction_date || tx.Date || new Date().toISOString().split('T')[0];
            const description = tx.description || tx.Description || tx.memo || 'External API Import';
            const debit = parseFloat(tx.debit || tx.Debit || tx.amount_out || 0);
            const credit = parseFloat(tx.credit || tx.Credit || tx.amount_in || 0);
            const amount = tx.amount || tx.Amount; // If a single amount field is used

            // Handle single amount field logic if debit/credit are missing
            let finalDebit = debit;
            let finalCredit = credit;
            if (debit === 0 && credit === 0 && amount !== undefined) {
                const numAmount = parseFloat(amount);
                if (numAmount < 0) finalDebit = Math.abs(numAmount);
                else finalCredit = numAmount;
            }

            return {
                company_id: companyId,
                transaction_date: date,
                description: description,
                debit_amount: finalDebit,
                credit_amount: finalCredit,
                balance: parseFloat(tx.balance || tx.Balance || 0),
                source: 'n8n_api',
                status: 'pending'
            };
        });

        const { data: insertedData, error } = await supabase
            .from('bank_entries')
            .insert(entriesToInsert)
            .select();

        if (error) {
            console.error('Public API Bank Entries Insert Error:', error);
            return NextResponse.json({
                error: 'Database insert failed',
                details: error.message
            }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            receivedCount: transactions.length,
            insertedCount: insertedData.length,
            message: `Successfully swallowed ${insertedData.length} transactions into Finza.`
        });

    } catch (error: any) {
        console.error('Public API Error:', error);
        const status = error.message.includes('API Key') ? 401 : 500;
        return NextResponse.json({
            error: error.message || 'Internal server error',
            details: 'Ensure your x-api-key header is correct and the JSON body is valid.'
        }, { status });
    }
}
