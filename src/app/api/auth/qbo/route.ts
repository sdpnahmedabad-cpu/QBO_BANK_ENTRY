import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';

export async function GET() {
    try {
        const authUri = qboClient.getAuthUri();
        return NextResponse.redirect(authUri);
    } catch (error) {
        console.error('OAuth Start Error:', error);
        return NextResponse.json({ error: 'Failed to initiate OAuth flow' }, { status: 500 });
    }
}
