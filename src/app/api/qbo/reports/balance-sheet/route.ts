import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;
        const date = searchParams.get('date') || undefined;

        console.log(`Fetching Balance Sheet report for ${date || 'default'}...`);
        const report = await qboClient.getBalanceSheet(supabase, date, companyId);
        console.log('Balance Sheet report fetched successfully');

        if (!report) {
            console.error('Report is null or undefined');
            return NextResponse.json({ error: 'No report data returned from QuickBooks' }, { status: 500 });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        console.error('Error fetching Balance Sheet:', error);
        return NextResponse.json({
            error: 'Failed to fetch Balance Sheet report',
            details: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
