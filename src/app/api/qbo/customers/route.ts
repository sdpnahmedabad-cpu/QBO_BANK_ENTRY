import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;

        console.log(`[API] Fetching customers for company: ${companyId}`);

        const data = await qboClient.getCustomers(supabase, companyId);

        console.log(`[API] Found ${data.length} customers`);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error('Error fetching customers:', error.message);
        return NextResponse.json({ error: 'Failed to fetch customers', details: error.message }, { status: 500 });
    }
}
