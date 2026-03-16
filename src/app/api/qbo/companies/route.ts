import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';

import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const includeInactive = searchParams.get('all') === 'true';

        // We need to bypass the qboClient wrapper slightly to get custom fields like client_email
        // or ensure qboClient returns it. For now, let's just query Supabase directly here for simplicity
        // in ensuring we get the email field.
        // Fetch basic info first. If client_email column is missing, this won't crash the whole fetch
        let query = supabase
            .from('quickbooks_clients')
            .select('*'); // Select all to avoid explicit column errors if one is missing

        if (!includeInactive) {
            query = query.eq('is_active', true);
        }

        const { data, error } = await query;

        if (error) throw error;

        // Map data to ensure we only return what's expected, providing fallback for client_email
        const companies = (data || []).map((c: any) => ({
            id: c.id,
            name: c.name,
            client_email: c.client_email || ""
        }));

        return NextResponse.json(companies);
    } catch (error) {
        console.error('Error fetching connected companies:', error);
        return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json();
        const { id, client_email } = body;

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        const { error } = await supabase
            .from('quickbooks_clients')
            .update({ client_email })
            .eq('id', id);

        if (error) throw error;

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error updating company email:', error);
        return NextResponse.json({ error: 'Failed to update company' }, { status: 500 });
    }
}
