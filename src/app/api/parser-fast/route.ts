import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        // Use dynamic import for ESM-only pdfjs-dist v4
        // We use the legacy build to ensure Node.js compatibility
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

        // Configure worker to avoid "fake worker failed" error
        // In Node.js, we can point to the worker file directly or use a specific setup
        // For v4 ESM, we need to point to the worker module string

        // Try to locate the worker file path
        const path = require('path');
        const { pathToFileURL } = require('url');
        const workerPath = path.join(process.cwd(), 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs');

        // Convert to file:// URL for Windows compatibility with ESM loader
        pdfjsLib.GlobalWorkerOptions.workerSrc = pathToFileURL(workerPath).href;

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
            return NextResponse.json({ error: "Invalid file type. Only PDF is supported." }, { status: 400 });
        }

        // Convert file to Uint8Array for pdfjs
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        // Load PDF document
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDocument = await loadingTask.promise;

        // Extract text from all pages with layout awareness
        let fullText = "";
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();

            // Map items with coordinates
            const items = textContent.items.map((item: any) => ({
                str: item.str,
                x: item.transform[4], // TranslateX
                y: item.transform[5], // TranslateY
                hasEOL: item.hasEOL
            }));

            // Sort items: High Y (Top) to Low Y (Bottom), then Left to Right
            items.sort((a: any, b: any) => {
                const dy = Math.abs(a.y - b.y);
                if (dy < 5) { // Same line tolerance
                    return a.x - b.x;
                }
                return b.y - a.y; // PDF Y is usually bottom-up, so sort descending for Top-to-Bottom reading
            });

            // Reconstruct lines
            let currentY = -99999;
            let currentLineText = "";

            items.forEach((item: any) => {
                if (Math.abs(item.y - currentY) > 5) {
                    if (currentLineText) fullText += currentLineText.trim() + "\n";
                    currentY = item.y;
                    currentLineText = "";
                }
                currentLineText += item.str + " "; // Add space between words
            });
            if (currentLineText) fullText += currentLineText.trim() + "\n";
        }

        // Parse transactions from text
        const transactions = extractTransactions(fullText);

        if (transactions.length === 0) {
            return NextResponse.json({
                error: "No transactions found",
                details: "Could not extract transaction data from PDF. Please ensure it's a valid bank statement."
            }, { status: 400 });
        }

        return NextResponse.json({ transactions });

    } catch (error: any) {
        console.error("PDF Parse Error:", error);
        return NextResponse.json({
            error: "Failed to process PDF",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}

function extractTransactions(text: string): any[] {
    // Preprocess: Join lines that appear to be continuations (e.g., date split across lines)
    const preprocessed = text.replace(/(\d{2}\/\d{2}\/)\s*\n\s*(\d{4})/g, '$1$2');

    const lines = preprocessed.split('\n');
    const transactions: any[] = [];
    let currentTx: any = {};

    lines.forEach((line) => {
        const cleanLine = line.trim();
        if (!cleanLine) return;

        // Pattern 1: Transaction Date: 01/01/2026
        const dateMatch = cleanLine.match(/Transaction Date:\s*(\d{2}\/\d{2}\/\d{4})/i);
        if (dateMatch) {
            if (currentTx.date && (currentTx.debit || currentTx.credit)) {
                transactions.push(currentTx);
            }
            currentTx = { date: dateMatch[1], balance: "0.00", description: "" };
            return;
        }

        // Pattern 2: Description: Amazon.com
        const descMatch = cleanLine.match(/Description:\s*(.*)/i);
        if (descMatch && currentTx.date) {
            currentTx.description = descMatch[1].trim();
            return;
        }

        // Pattern 3: Debit: 50.00
        const debitMatch = cleanLine.match(/Debit:\s*(\d+\.\d{2})/i);
        if (debitMatch && currentTx.date) {
            currentTx.debit = debitMatch[1];
            currentTx.credit = "0.00";
            return;
        }

        // Pattern 4: Credit: 1000.00
        const creditMatch = cleanLine.match(/Credit:\s*(\d+\.\d{2})/i);
        if (creditMatch && currentTx.date) {
            currentTx.credit = creditMatch[1];
            currentTx.debit = "0.00";
            return;
        }
    });

    // Push last transaction
    if (currentTx.date && (currentTx.debit || currentTx.credit)) {
        if (!currentTx.description) currentTx.description = "Transaction";
        transactions.push(currentTx);
    }

    return transactions;
}

function formatDate(dateStr: string): string {
    // Try to convert various date formats to DD/MM/YYYY
    try {
        // Handle formats like "01 Jan 2024" or "Jan 01"
        if (dateStr.match(/[A-Za-z]/)) {
            const months: { [key: string]: string } = {
                'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
                'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
                'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
            };

            for (const [month, num] of Object.entries(months)) {
                if (dateStr.includes(month)) {
                    const parts = dateStr.split(/\s+/);
                    const day = parts.find(p => /^\d{1,2}$/.test(p)) || '01';
                    const year = parts.find(p => /^\d{4}$/.test(p)) || new Date().getFullYear().toString();
                    return `${day.padStart(2, '0')}/${num}/${year}`;
                }
            }
        }

        // Handle DD/MM/YYYY, DD-MM-YYYY, etc.
        return dateStr.replace(/[-\.]/g, '/');
    } catch {
        return dateStr;
    }
}
