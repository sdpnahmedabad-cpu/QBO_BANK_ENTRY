import { NextResponse } from 'next/server';
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');

export const runtime = 'nodejs';

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), 'test_upload.pdf');
        console.log("Reading file from:", filePath);

        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "Test file not found at " + filePath }, { status: 404 });
        }

        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);

        return NextResponse.json({
            success: true,
            textLength: data.text.length,
            textPreview: data.text.substring(0, 100)
        });

    } catch (error: any) {
        console.error("Debug PDF Error:", error);
        return NextResponse.json({
            error: "Failed to parse PDF",
            details: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
