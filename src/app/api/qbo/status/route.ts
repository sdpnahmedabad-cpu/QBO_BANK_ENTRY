import { NextResponse } from 'next/server';
import { tokenStorage } from '@/lib/token-storage';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;

        const isConnected = await tokenStorage.isAuthenticated(supabase, companyId);
        const token = isConnected ? await tokenStorage.load(supabase, companyId) : null;

        return NextResponse.json({
            isConnected,
            lastSync: token ? new Date(token.createdAt || 0).toISOString() : null
        });
    } catch (error: any) {
        console.error('Status API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
