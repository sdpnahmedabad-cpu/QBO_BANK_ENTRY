import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;
        const date = searchParams.get('date') || undefined;

        console.log(`[API] AgedReceivables - Received date: "${date}", companyId: "${companyId}"`);

        console.log('Fetching Aged Receivables report...');
        const report = await qboClient.getAgedReceivables(supabase, date, companyId);
        console.log('Aged Receivables report fetched successfully');

        // Check if report has the expected structure
        if (!report) {
            console.error('Report is null or undefined');
            return NextResponse.json({ error: 'No report data returned from QuickBooks' }, { status: 500 });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        console.error('Error fetching Aged Receivables:', error);
        return NextResponse.json({
            error: 'Failed to fetch Aged Receivables report',
            details: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
