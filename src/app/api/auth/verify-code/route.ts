import { NextRequest, NextResponse } from 'next/server';
import { verifyOTPCode, verifyMagicLinkToken } from '@/lib/emailVerification';

export async function POST(req: NextRequest) {
  try {
    const { token, code, magicToken } = await req.json() as {
      token?: string;
      code?: string;
      magicToken?: string;
    };

    if (!token) return NextResponse.json({ error: 'Token diperlukan' }, { status: 400 });

    // Magic link verification (VERIFY HERE button in email)
    if (magicToken) {
      const result = await verifyMagicLinkToken(token, magicToken);
      if (result.ok) return NextResponse.json({ success: true, email: result.email });
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // Manual code verification
    if (!code) return NextResponse.json({ error: 'Kode diperlukan' }, { status: 400 });
    const result = await verifyOTPCode(token, code.trim());
    if (result.ok) return NextResponse.json({ success: true, email: result.email });
    return NextResponse.json({ error: result.error }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
