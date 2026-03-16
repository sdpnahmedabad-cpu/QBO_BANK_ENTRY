import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';
import { verifyApiKey } from '@/lib/api-auth';

/**
 * Public API for 3rd parties to pull Debtors (Aged Receivables) data.
 * 
 * Header Required:
 * x-api-key: finza_live_xxxx
 * 
 * Query Parameters:
 * ?date=YYYY-MM-DD (Optional, defaults to today)
 */
export async function GET(request: Request) {
    try {
        // 1. Authenticate via API Key
        const companyId = await verifyApiKey(request);

        const { searchParams } = new URL(request.url);
        const date = searchParams.get('date') || undefined;

        console.log(`[Public API] Debtors - Company: ${companyId}, Date: ${date}`);

        const supabase = await createClient();

        // 2. Fetch data from QBO via qboClient
        const report = await qboClient.getAgedReceivables(supabase, date, companyId);

        if (!report) {
            return NextResponse.json({ error: 'No report data returned from QuickBooks' }, { status: 500 });
        }

        // 3. Return clean JSON
        return NextResponse.json({
            success: true,
            companyId: companyId,
            report: report
        });

    } catch (error: any) {
        console.error('Public API Debtors Error:', error);
        return NextResponse.json({
            error: error.message || 'Internal server error'
        }, {
            status: error.message === 'Invalid API Key.' ? 401 : 500
        });
    }
}
