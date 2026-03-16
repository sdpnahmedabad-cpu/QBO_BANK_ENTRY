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
            console.log(`[P&L Report] Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

export async function GET(request: Request) {
    try {
        const supabase = await createClient();
        const { searchParams } = new URL(request.url);
        const companyId = searchParams.get('companyId') || undefined;
        const startDate = searchParams.get('start_date') || undefined;
        const endDate = searchParams.get('end_date') || undefined;
        const summarize_column_by = searchParams.get('summarize_column_by') || undefined;

        console.log(`Fetching Profit & Loss report for ${startDate || 'default'} to ${endDate || 'default'}...`);

        // Retry the report fetch with exponential backoff
        const report = await retryWithBackoff(
            () => qboClient.getProfitAndLoss(supabase, startDate, endDate, companyId, { summarize_column_by }),
            3,
            500
        );

        console.log('Profit & Loss report fetched successfully');

        if (!report) {
            console.error('Report is null or undefined');
            return NextResponse.json({ error: 'No report data returned from QuickBooks' }, { status: 500 });
        }

        return NextResponse.json(report);
    } catch (error: any) {
        console.error('Error fetching Profit & Loss:', error);

        // For connection errors, return a more specific error
        if (error.message?.includes('Connection reset') ||
            error.message?.includes('ECONNRESET') ||
            error.message?.includes('socket hang up')) {
            return NextResponse.json({
                error: 'Connection to QuickBooks temporarily unavailable',
                details: 'Please try refreshing the page in a moment.'
            }, { status: 503 });
        }

        return NextResponse.json({
            error: 'Failed to fetch Profit & Loss report',
            details: error?.message || 'Unknown error'
        }, { status: 500 });
    }
}
