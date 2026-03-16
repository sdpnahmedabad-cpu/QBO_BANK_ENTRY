import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;
        const type = searchParams.get('type');

        console.log(`[API] Fetching accounts for company: ${companyId}, type: ${type}`);

        let data;
        if (type === 'Bank') {
            data = await qboClient.getBankAccounts(supabase, companyId);
        } else {
            data = await qboClient.getChartOfAccounts(supabase, companyId);
        }

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('API Error:', error.message);

        if (error.message === 'Not authenticated' || error.message.includes('token_rejected')) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        return NextResponse.json({ error: 'Failed to fetch accounts', details: error.message }, { status: 500 });
    }
}
