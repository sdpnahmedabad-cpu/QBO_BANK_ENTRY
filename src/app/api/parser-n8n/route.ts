import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        console.log('=== PDF Parser API Called (n8n/Make) ===');

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        // Prioritize n8n, fallback to Make
        const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
        const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;

        console.log('DEBUG: N8N_WEBHOOK_URL =', n8nWebhookUrl ? 'FOUND' : 'MISSING');
        console.log('DEBUG: MAKE_WEBHOOK_URL =', makeWebhookUrl ? 'FOUND' : 'MISSING');

        const webhookUrl = n8nWebhookUrl || makeWebhookUrl;

        console.log('--- DEBUG WEBHOOK URL ---');
        console.log(`Value: "${webhookUrl}"`);
        console.log(`Length: ${webhookUrl?.length}`);
        if (webhookUrl) {
            console.log(`Chars: ${Array.from(webhookUrl).map(c => c.charCodeAt(0)).join(',')}`);
        }

        const isPlaceholderN8n = webhookUrl === 'https://your-n8n-instance.com/webhook/pdf-parser';
        const isPlaceholderN8n2 = webhookUrl === 'https://your-n8n-webhook-url-here';
        const containsMakePlaceholder = webhookUrl?.includes('YOUR_WEBHOOK_ID_HERE');

        console.log('isPlaceholderN8n:', isPlaceholderN8n);
        console.log('isPlaceholderN8n2:', isPlaceholderN8n2);
        console.log('containsMakePlaceholder:', containsMakePlaceholder);

        if (!webhookUrl || isPlaceholderN8n || isPlaceholderN8n2 || containsMakePlaceholder) {
            console.error('No valid Webhook URL found in environment');
            const reason = !webhookUrl ? 'MISSING' : 'PLACEHOLDER';
            return NextResponse.json({
                error: "Webhook not configured",
                details: `Provider: ${n8nWebhookUrl ? 'n8n' : 'Make'}, Reason: ${reason}`
            }, { status: 500 });
        }

        const provider = n8nWebhookUrl ? 'n8n' : 'Make.com';
        console.log(`Forwarding file to ${provider}:`, file.name);

        // Forward the file
        const forwardFormData = new FormData();
        forwardFormData.append('file', file);

        const response = await fetch(webhookUrl, {
            method: 'POST',
            body: forwardFormData
        });

        console.log(`${provider} Response Status:`, response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`${provider} Error Response:`, errorText);
            return NextResponse.json({
                error: `${provider} processing failed`,
                details: errorText,
                status: response.status
            }, { status: response.status });
        }

        const data = await response.json();
        console.log(`${provider} Response received`);

        // Handle different response formats
        // n8n usually returns an array or an object with data
        let transactions = [];
        if (Array.isArray(data)) {
            transactions = data;
        } else if (data.transactions) {
            transactions = data.transactions;
        } else if (data.data && Array.isArray(data.data)) {
            transactions = data.data;
        }

        if (transactions.length === 0) {
            return NextResponse.json({
                error: "No transactions found",
                details: `${provider} did not return any transaction data.`
            }, { status: 400 });
        }

        return NextResponse.json({ transactions });

    } catch (error: any) {
        console.error('Unexpected error in PDF parser:', error);
        return NextResponse.json({
            error: "Unexpected server error",
            details: error.message
        }, { status: 500 });
    }
}
