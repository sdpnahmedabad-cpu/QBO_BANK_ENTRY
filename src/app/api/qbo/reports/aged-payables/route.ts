import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;
        const date = searchParams.get('date') || undefined;

        console.log(`[API] AgedPayables - Received date: "${date}", companyId: "${companyId}"`);
        console.log('Fetching Aged Payables report...');
        const report = await qboClient.getAgedPayables(supabase, date, companyId);
        console.log('Aged Payables report fetched successfully');

        // Check if report has the expected structure
        if (!report) {
            console.error('Report is null or undefined');
            return NextResponse.json({ error: 'No report data returned from QuickBooks' }, { status: 500 });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        console.error('Error fetching Aged Payables:', error);
        console.error('Error message:', error?.message);
        console.error('Error stack:', error?.stack);

        return NextResponse.json({
            error: 'Failed to fetch Aged Payables report',
            details: error?.message || 'Unknown error',
            authenticated: error?.message?.includes('authenticated') ? false : undefined
        }, { status: 500 });
    }
}
