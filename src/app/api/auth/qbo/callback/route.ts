import { NextRequest, NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';
import { tokenStorage } from '@/lib/token-storage';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const realmId = searchParams.get('realmId');

    // Parse the full URL for the client library to verify
    // intuit-oauth expects the full url including query params
    const fullUrl = request.url;

    if (!code || !realmId) {
        return NextResponse.json({ error: 'Missing code or realmId' }, { status: 400 });
    }

    try {
        const supabase = await createClient();

        // Check if we already have a token for this realmId that was created very recently (last 30 seconds)
        // This handles double-triggering in dev mode.
        const existingToken = await tokenStorage.load(supabase, realmId);

        if (existingToken && (Date.now() - existingToken.createdAt < 30000)) {
            console.log('Token already exists and is fresh. Redirecting to dashboard.');
            const host = request.headers.get('host') || 'finza-ymgo.onrender.com';
            const protocol = request.headers.get('x-forwarded-proto') || 'https';
            return NextResponse.redirect(`${protocol}://${host}/`);
        }

        await qboClient.createToken(supabase, fullUrl);

        // Fetch company info to get the name
        // Pass realmId to ensure we get info for the company we just connected
        const companyInfo = await qboClient.getCompanyInfo(supabase, realmId as string);
        const companyName = companyInfo.CompanyInfo?.CompanyName || companyInfo.companyName || `Company ${realmId}`;

        // Update the token with the company name
        const tokens = await tokenStorage.load(supabase, realmId as string);
        if (tokens) {
            await tokenStorage.save(supabase, tokens, realmId as string, companyName);
        }

        // Successful login, redirect back to dashboard
        const host = request.headers.get('host') || 'finza-ymgo.onrender.com';
        const protocol = request.headers.get('x-forwarded-proto') || 'https';
        return NextResponse.redirect(`${protocol}://${host}/`);
    } catch (error: any) {
        console.error('OAuth Callback Error:', {
            message: error.message,
            stack: error.stack,
            response: error.response?.body,
            code: error.code
        });

        return NextResponse.json({
            error: 'Authentication failed',
            details: error.message || 'Unknown error',
            code: error.code || 'UNKNOWN_ERROR'
        }, { status: 500 });
    }
}
