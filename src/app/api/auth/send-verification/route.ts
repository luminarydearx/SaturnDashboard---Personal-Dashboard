import { NextRequest, NextResponse } from 'next/server';
import { createOTPToken, sendVerificationEmail } from '@/lib/emailVerification';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string };
    if (!email || !EMAIL_RE.test(email))
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });

    const lower = email.toLowerCase().trim();
    const { code, token, magicToken } = await createOTPToken(lower);
    await sendVerificationEmail(lower, code, magicToken, token);

    return NextResponse.json({ success: true, token, message: 'Kode dikirim ke ' + lower });
  } catch (e: any) {
    console.error('send-verification error:', e);
    return NextResponse.json({ error: 'Gagal mengirim email.' }, { status: 500 });
  }
}
