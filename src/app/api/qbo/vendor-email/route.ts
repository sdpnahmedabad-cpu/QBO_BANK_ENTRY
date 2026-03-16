import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const vendorName = searchParams.get('name');
        const companyId = searchParams.get('companyId') || undefined;

        if (!vendorName) {
            return NextResponse.json({ email: '' });
        }

        console.log(`[API] Looking up email for vendor: "${vendorName}"`);

        const vendors = await qboClient.getVendors(supabase, companyId);

        // Find vendor by DisplayName (case-insensitive)
        const match = vendors.find((v: any) =>
            v.DisplayName?.toLowerCase().trim() === vendorName.toLowerCase().trim()
        );

        if (match) {
            const email = match.PrimaryEmailAddr?.Address || '';
            console.log(`[API] Found vendor "${vendorName}" — email: "${email || '(none)'}"`);
            return NextResponse.json({ email, vendorName: match.DisplayName });
        }

        console.log(`[API] Vendor "${vendorName}" not found in QBO`);
        return NextResponse.json({ email: '', vendorName });
    } catch (error: any) {
        console.error('Error fetching vendor email:', error.message);
        return NextResponse.json({ email: '', error: error.message });
    }
}
