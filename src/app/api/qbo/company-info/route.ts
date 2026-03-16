import { NextResponse } from 'next/server';
import { qboClient } from '@/lib/qbo';
import { createClient } from '@/utils/supabase/server';

// Helper function to retry with exponential backoff
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 500
): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Only retry on connection/network errors
            const isRetryable = error.message?.includes('Connection reset') ||
                error.message?.includes('ECONNRESET') ||
                error.message?.includes('socket hang up') ||
                error.message?.includes('network');

            if (!isRetryable || attempt === maxRetries - 1) {
                throw error;
            }

            // Exponential backoff: 500ms, 1000ms, 2000ms
            const delay = initialDelay * Math.pow(2, attempt);
            console.log(`[Company Info] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId');

        if (!companyId) {
            return NextResponse.json({ error: 'Company ID required' }, { status: 400 });
        }

        // Retry the company info query with exponential backoff
        const info = await retryWithBackoff(
            () => qboClient.getCompanyInfoQuery(supabase, companyId),
            3,
            500
        );

        return NextResponse.json(info || {});
    } catch (error: any) {
        console.error('Company Info API Error:', error);

        // Check for authentication errors
        if (error.message === 'Not authenticated' || error.message?.includes('token_rejected')) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        // For connection errors, return a more specific error
        if (error.message?.includes('Connection reset') ||
            error.message?.includes('ECONNRESET') ||
            error.message?.includes('socket hang up')) {
            return NextResponse.json({
                error: 'Connection to QuickBooks temporarily unavailable. Please try again.'
            }, { status: 503 });
        }

        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
