import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;

        console.log(`[API] Fetching vendors for company: ${companyId}`);
        const data = await qboClient.getVendors(supabase, companyId);
        console.log(`[API] Found ${data.length} vendors`);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching vendors:', error.message);
        return NextResponse.json({ error: 'Failed to fetch vendors', details: error.message }, { status: 500 });
    }
}
