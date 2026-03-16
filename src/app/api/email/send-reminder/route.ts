import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
    try {
        const { to, subject, body } = await request.json();

        if (!to) {
            return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 });
        }

        const user = process.env.EMAIL_USER;
        const pass = process.env.EMAIL_PASS;
        const host = process.env.EMAIL_HOST || 'smtp.gmail.com';

        if (!user || !pass) {
            console.error('Email credentials missing in .env');
            return NextResponse.json({ error: 'Server email configuration missing' }, { status: 500 });
        }

        const transporter = nodemailer.createTransport({
            host,
            port: 587,
            secure: false,
            auth: { user, pass },
        });

        await transporter.sendMail({
            from: `"${process.env.EMAIL_FROM_NAME || 'Finza Reporting'}" <${user}>`,
            to,
            subject: subject || 'Payment Reminder',
            text: body || 'This is a payment reminder for your outstanding balance. Please arrange payment at your earliest convenience.',
        });

        console.log(`[Email] Reminder sent successfully to ${to}`);
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Email send error:', error);
        return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
    }
}
