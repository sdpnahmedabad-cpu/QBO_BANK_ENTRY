import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const bodyData = await request.json();
        const { to, subject, body, fileBase64, filename } = bodyData;

        if (!to || !fileBase64) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Check environment variables
        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;
        const host = process.env.EMAIL_HOST || 'smtp.gmail.com';

        if (!user || !pass) {
            console.error('Email credentials missing in .env');
            return NextResponse.json({ error: 'Server email configuration missing' }, { status: 500 });
        }

        // Convert Base64 to Buffer
        const buffer = Buffer.from(fileBase64, 'base64');

        // Create Transporter
        const transporter = nodemailer.createTransport({
            host: host,
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: user,
                pass: pass,
            },
        });

        // Send Email
        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'Finza Reporting'}" <${user}>`,
            to: to,
            subject: subject || 'MIS Report',
            text: body || 'Please find the attached report.',
            attachments: [
                {
                    filename: filename || 'report.pdf',
                    content: buffer
                }
            ]
        });

        console.log(`Email sent successfully to ${to}`);
        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Email send error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }
}
