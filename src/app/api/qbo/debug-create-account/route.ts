import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    console.log('[Debug Route] create-account called');
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        console.log(`[Debug Route] Creating account for company: ${companyId}`);

        const accountData = {
            Name: `Test Bank ${Date.now()}`,
            AccountType: "Bank",
            AccountSubType: "Checking",
            CurrencyRef: {
                value: "USD", name: "United States Dollar"
            }
        };

        const result = await qboClient.createEntity(supabase, 'Account', accountData, companyId);

        return NextResponse.json({ success: true, result });
    } catch (error: any) {
        console.error('[Debug Route] Error:', error);
        return NextResponse.json({
            error: error.message,
            details: error.response?.data || error
        }, { status: 500 });
    }
}
