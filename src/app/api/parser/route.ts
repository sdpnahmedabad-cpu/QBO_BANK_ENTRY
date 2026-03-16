import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        console.log('=== PDF Parser API Called ===');

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
            return NextResponse.json({ error: "Invalid file type. Only PDF is supported." }, { status: 400 });
        }

        console.log('File received:', file.name, 'Size:', file.size);

        // Step 1: Extract text from PDF using pdfjs-dist
        console.log('Step 1: Extracting text from PDF...');
        let extractedText = '';

        try {
            const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
            const path = require('path');
            const { pathToFileURL } = require('url');
            const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');
            pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
            const pdfDocument = await loadingTask.promise;

            console.log('PDF loaded successfully. Pages:', pdfDocument.numPages);

            // Extract text from all pages
            for (let i = 1; i <= pdfDocument.numPages; i++) {
                const page = await pdfDocument.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map((item: any) => item.str).join(' ');
                extractedText += pageText + '\n';
            }

            console.log('Text extracted. Length:', extractedText.length, 'characters');

            if (extractedText.trim().length < 50) {
                console.warn('Very little text extracted. PDF might be scanned/image-based.');
                return NextResponse.json({
                    error: "PDF appears to be scanned or image-based",
                    details: "This PDF contains very little extractable text. Please use a text-based PDF or convert to Excel/CSV.",
                    extractedLength: extractedText.length
                }, { status: 400 });
            }

        } catch (pdfError: any) {
            console.error('PDF text extraction failed:', pdfError);
            return NextResponse.json({
                error: "Failed to extract text from PDF",
                details: pdfError.message,
                suggestion: "The PDF might be corrupted or password-protected. Try exporting as Excel/CSV instead."
            }, { status: 500 });
        }

        // Step 2: Send extracted text to Gemini
        console.log('Step 2: Sending text to Gemini AI...');

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('GEMINI_API_KEY not found in environment');
            return NextResponse.json({
                error: "Server configuration error",
                details: "Gemini API key is not configured. Please check .env.local file."
            }, { status: 500 });
        }

        const model = "gemini-2.0-flash";
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

        const prompt = `You are a bank statement parser. Extract all transactions from the following bank statement text and return ONLY a valid JSON array.

Bank Statement Text:
${extractedText}

Required JSON format (return ONLY this, no markdown, no explanation):
[
  {
    "date": "DD/MM/YYYY",
    "description": "Transaction description",
    "debit": "0.00",
    "credit": "0.00",
    "balance": "0.00"
  }
]

Rules:
1. Convert all dates to DD/MM/YYYY format
2. Remove currency symbols
3. Debit and Credit are mutually exclusive (one must be 0.00)
4. Keep 2 decimal places
5. Return ONLY the JSON array, nothing else`;

        console.log('Calling Gemini API...');

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: prompt }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    maxOutputTokens: 8192,
                    responseMimeType: "application/json"
                }
            })
        });

        console.log('Gemini API Response Status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Gemini API Error Response:', errorText);

            let errorMessage = "Gemini API request failed";
            let errorDetails = errorText;

            try {
                const errorJson = JSON.parse(errorText);
                if (response.status === 429) {
                    errorMessage = "Rate limit exceeded";
                    errorDetails = "The Gemini API free tier has been exhausted. Please wait 10-15 minutes or upgrade to a paid tier.";
                } else if (errorJson.error?.message) {
                    errorDetails = errorJson.error.message;
                }
            } catch (e) {
                // Error text is not JSON
            }

            return NextResponse.json({
                error: errorMessage,
                details: errorDetails,
                status: response.status,
                suggestion: response.status === 429
                    ? "Wait 10-15 minutes and try again, or use Excel/CSV upload instead"
                    : "Check your Gemini API key configuration"
            }, { status: response.status });
        }

        const result = await response.json();
        console.log('Gemini API Response received');

        let text = result.candidates?.[0]?.content?.parts?.[0]?.text || "[]";

        // Clean up response
        text = text.replace(/```json/g, "").replace(/```/g, "").trim();

        console.log('Parsing Gemini response...');

        try {
            const transactions = JSON.parse(text);

            if (!Array.isArray(transactions)) {
                throw new Error('Response is not an array');
            }

            if (transactions.length === 0) {
                return NextResponse.json({
                    error: "No transactions found",
                    details: "Gemini AI could not find any transactions in the PDF text.",
                    suggestion: "The PDF format might not be recognized. Try Excel/CSV upload instead.",
                    extractedTextPreview: extractedText.substring(0, 200)
                }, { status: 400 });
            }

            console.log('Success! Extracted', transactions.length, 'transactions');
            return NextResponse.json({ transactions });

        } catch (parseError: any) {
            console.error('Failed to parse Gemini response:', text.substring(0, 200));
            return NextResponse.json({
                error: "AI returned invalid format",
                details: "Gemini AI did not return valid JSON",
                rawResponse: text.substring(0, 300),
                suggestion: "Try uploading as Excel/CSV for guaranteed results"
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('Unexpected error in PDF parser:', error);
        return NextResponse.json({
            error: "Unexpected server error",
            details: error.message,
            stack: error.stack?.substring(0, 500)
        }, { status: 500 });
    }
}
