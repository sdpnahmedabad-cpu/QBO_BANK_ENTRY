import { NextResponse } from 'next/server';
import { tokenStorage } from '@/lib/token-storage';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const body = await request.json().catch(() => ({}));
        const { companyId } = body;

        // In real app, we should also call qboClient.revoke() to invalidate on QBO side
        await tokenStorage.clear(supabase, companyId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Disconnect Error:', error);
        return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 });
    }
}
