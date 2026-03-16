import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
    try {
        const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
        const pdfDocument = await loadingTask.promise;

        let fullText = "";
        for (let i = 1; i <= pdfDocument.numPages; i++) {
            const page = await pdfDocument.getPage(i);
            const textContent = await page.getTextContent();

            const items = textContent.items.map((item: any) => ({
                str: item.str,
                x: item.transform[4],
                y: item.transform[5],
                hasEOL: item.hasEOL
            }));

            items.sort((a: any, b: any) => {
                const dy = Math.abs(a.y - b.y);
                if (dy < 5) return a.x - b.x;
                return b.y - a.y;
            });

            let currentY = -99999;
            let currentLineText = "";

            items.forEach((item: any) => {
                if (Math.abs(item.y - currentY) > 5) {
                    if (currentLineText) fullText += currentLineText.trim() + "\n";
                    currentY = item.y;
                    currentLineText = "";
                }
                currentLineText += item.str + " ";
            });
            if (currentLineText) fullText += currentLineText.trim() + "\n";
        }

        return NextResponse.json({
            text: fullText
        });

    } catch (error: any) {
        return NextResponse.json({
            error: error.message
        }, { status: 500 });
    }
}
