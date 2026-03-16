import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;
        const startDate = searchParams.get('start_date') || undefined;
        const endDate = searchParams.get('end_date') || undefined;

        console.log('Fetching Cash Flow report...');
        const report = await qboClient.CashFlow(supabase, startDate, endDate, companyId);
        console.log('Cash Flow report fetched successfully');

        if (!report) {
            console.error('Report is null or undefined');
            return NextResponse.json({ error: 'No report data returned from QuickBooks' }, { status: 500 });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        console.error('Error fetching Cash Flow:', error);
        return NextResponse.json({
            error: 'Failed to fetch Cash Flow report',
            details: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
