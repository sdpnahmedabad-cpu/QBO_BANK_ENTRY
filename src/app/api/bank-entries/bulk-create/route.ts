import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { data } = body;

        if (!data || !Array.isArray(data)) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Format data for Supabase table bank_entries
        const entriesToInsert = data.map((row: any) => ({
            user_id: user.id,
            transaction_date: formatDate(row.Date),
            description: row.Description || '',
            debit_amount: parseFloat(row.Debit || 0),
            credit_amount: parseFloat(row.Credit || 0),
            balance: parseFloat(row.Balance || 0),
            source: 'import',
            status: 'pending'
        }));

        const { data: insertedData, error } = await supabase
            .from('bank_entries')
            .insert(entriesToInsert)
            .select();

        if (error) {
            console.error('Supabase Bulk Insert Error:', error);
            return NextResponse.json({
                error: 'Database insert failed',
                details: error.message,
                successCount: 0,
                errorCount: data.length,
                errors: [{ row: 'all', error: error.message }]
            }, { status: 500 });
        }

        return NextResponse.json({
            successCount: insertedData.length,
            errorCount: 0,
            errors: []
        });

    } catch (error: any) {
        console.error('Bank Entries Bulk Create Error:', error);
        return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
    }
}

function formatDate(dateStr: string) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    // Attempt to handle DD/MM/YYYY
    const parts = dateStr.split('/');
    if (parts.length === 3) {
        const [d, m, y] = parts;
        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }

    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
}
