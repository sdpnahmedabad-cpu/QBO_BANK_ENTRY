import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const customerName = searchParams.get('name');
        const companyId = searchParams.get('companyId') || undefined;

        if (!customerName) {
            return NextResponse.json({ email: '' });
        }

        console.log(`[API] Looking up email for customer: "${customerName}"`);

        const customers = await qboClient.getCustomers(supabase, companyId);

        // Find customer by DisplayName (case-insensitive)
        const match = customers.find((c: any) =>
            c.DisplayName?.toLowerCase().trim() === customerName.toLowerCase().trim()
        );

        if (match) {
            const email = match.PrimaryEmailAddr?.Address || '';
            console.log(`[API] Found customer "${customerName}" — email: "${email || '(none)'}"`);
            return NextResponse.json({ email, customerName: match.DisplayName });
        }

        console.log(`[API] Customer "${customerName}" not found in QBO`);
        return NextResponse.json({ email: '', customerName });
    } catch (error: any) {
        console.error('Error fetching customer email:', error.message);
        return NextResponse.json({ email: '', error: error.message });
    }
}
