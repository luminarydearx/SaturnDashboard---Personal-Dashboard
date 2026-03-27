import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/db';
import { createOTPToken, sendVerificationEmail } from '@/lib/emailVerification';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json() as { email: string };
    if (!email || !EMAIL_RE.test(email))
      return NextResponse.json({ error: 'Email tidak valid' }, { status: 400 });

    const lower = email.toLowerCase().trim();
    const user  = getUserByEmail(lower);

    // Always return success to prevent user enumeration attacks
    if (!user) {
      return NextResponse.json({ success: true, message: 'Jika email terdaftar, kode reset telah dikirim.' });
    }

    const { code, token, magicToken } = await createOTPToken(lower);

    // Build reset link
    const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetLink = `${BASE_URL}/auth/reset-password?jwt=${encodeURIComponent(token)}&magic=${magicToken}`;

    // Send email with reset code
    await sendResetEmail(lower, user.displayName || user.username, code, magicToken, token);

    return NextResponse.json({ success: true, token, message: 'Kode reset dikirim ke ' + lower });
  } catch (e: any) {
    console.error('forgot-password error:', e);
    return NextResponse.json({ error: 'Gagal mengirim email. Coba lagi.' }, { status: 500 });
  }
}

async function sendResetEmail(email: string, name: string, code: string, magicToken: string, jwtToken: string) {
  const nodemailer = (await import('nodemailer')).default;
  const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const resetLink = `${BASE_URL}/auth/reset-password?jwt=${encodeURIComponent(jwtToken)}&magic=${magicToken}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const html = `<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#04040d;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04040d;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td align="center" style="padding-bottom:28px;">
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.35);border-radius:14px;padding:11px 20px;">
              <table cellpadding="0" cellspacing="0"><tr>
                <td style="font-size:20px;vertical-align:middle;padding-right:10px;">🔐</td>
                <td style="color:#fff;font-family:Courier,monospace;font-weight:700;font-size:15px;letter-spacing:3px;vertical-align:middle;">SATURN DASHBOARD</td>
              </tr></table>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="background:linear-gradient(135deg,rgba(239,68,68,.08),rgba(124,58,237,.05));border:1px solid rgba(239,68,68,.28);border-radius:22px;padding:40px 36px;text-align:center;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td align="center" style="padding-bottom:20px;">
              <div style="width:60px;height:60px;background:linear-gradient(135deg,#dc2626,#7c3aed);border-radius:18px;display:inline-block;line-height:60px;text-align:center;font-size:28px;">🔑</div>
            </td></tr>
            <tr><td align="center">
              <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px;">Reset Password</h1>
              <p style="color:rgba(255,255,255,.5);font-size:14px;margin:0 0 8px;">Halo, <strong style="color:#fff;">${name}</strong>!</p>
              <p style="color:rgba(255,255,255,.5);font-size:13px;margin:0 0 32px;line-height:1.6;">
                Kamu meminta reset password untuk akun Saturn Dashboard.<br>Masukkan kode di bawah atau klik tombol untuk reset langsung.
              </p>
            </td></tr>
            <tr><td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,.4);border:2px solid rgba(239,68,68,.45);border-radius:16px;padding:18px 24px;">
                <tr><td align="center" style="padding-bottom:12px;">
                  <span style="color:rgba(255,255,255,.4);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">KODE RESET</span>
                </td></tr>
                <tr><td align="center">
                  <table cellpadding="0" cellspacing="0"><tr>
                    ${code.split('').map(ch => `<td style="padding:0 3px;"><div style="width:38px;height:50px;line-height:50px;background:rgba(220,38,38,.2);border:1.5px solid rgba(239,68,68,.5);border-radius:10px;color:#fca5a5;font-family:Courier,monospace;font-size:22px;font-weight:700;text-align:center;">${ch}</div></td>`).join('')}
                  </tr></table>
                </td></tr>
                <tr><td align="center" style="padding-top:12px;">
                  <span style="color:rgba(255,255,255,.25);font-size:11px;">Berlaku selama 10 menit</span>
                </td></tr>
              </table>
            </td></tr>
            <tr><td align="center" style="padding-bottom:24px;">
              <a href="${resetLink}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#7c3aed);color:#fff;text-decoration:none;padding:14px 32px;border-radius:13px;font-size:15px;font-weight:700;box-shadow:0 6px 22px rgba(220,38,38,.4);">
                🔑 RESET PASSWORD — Klik di sini
              </a>
            </td></tr>
            <tr><td align="center">
              <p style="color:rgba(255,255,255,.18);font-size:11px;margin:0;line-height:1.7;">
                Jika kamu tidak meminta reset password, abaikan email ini.<br>Password kamu tetap aman.
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:20px;">
          <p style="color:rgba(255,255,255,.12);font-size:11px;margin:0;">Saturn Dashboard &middot; Built by Dearly Febriano Irwansyah &copy; ${new Date().getFullYear()}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Saturn Dashboard 🔐" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `${code} — Reset Password Saturn Dashboard`,
    html,
    text: `Kode reset password: ${code}\n\nReset langsung: ${resetLink}\n\nBerlaku 10 menit.`,
  });
}
