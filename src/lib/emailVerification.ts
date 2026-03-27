import nodemailer from 'nodemailer';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || '1234567890abcdefg1234567890abcdefg1234567890abcdefg1234567890abcdefg';
const SECRET     = new TextEncoder().encode(JWT_SECRET + '-otp');
const CHARS      = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OTP_TTL_S  = 600;

function genCode(len = 6): string {
  let s = '';
  for (let i = 0; i < len; i++) s += CHARS[Math.floor(Math.random() * CHARS.length)];
  return s;
}

async function hashCode(code: string, email: string): Promise<string> {
  const data  = `${code.toUpperCase()}:${email.toLowerCase()}:${JWT_SECRET}`;
  const bytes = new TextEncoder().encode(data);
  const hash  = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

export async function createOTPToken(email: string) {
  const code       = genCode(6);
  const magicToken = genCode(32).toLowerCase();
  const codeHash   = await hashCode(code, email);
  const token = await new SignJWT({ email: email.toLowerCase(), codeHash, magicToken, type: 'email-verify' })
    .setProtectedHeader({ alg: 'HS256' }).setIssuedAt().setExpirationTime(`${OTP_TTL_S}s`).sign(SECRET);
  return { code, token, magicToken };
}

export async function verifyOTPCode(token: string, code: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== 'email-verify' || typeof payload.email !== 'string')
      return { ok: false, error: 'Token tidak valid' };
    const expectedHash = await hashCode(code, payload.email);
    if (expectedHash !== payload.codeHash) return { ok: false, error: 'Kode tidak valid' };
    return { ok: true, email: payload.email };
  } catch (e: any) {
    return { ok: false, error: e?.code === 'ERR_JWT_EXPIRED' ? 'Kode sudah kedaluwarsa. Kirim ulang kode.' : 'Token tidak valid' };
  }
}

export async function verifyMagicLinkToken(jwtToken: string, magicToken: string): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const { payload } = await jwtVerify(jwtToken, SECRET);
    if (payload.type !== 'email-verify' || typeof payload.email !== 'string')
      return { ok: false, error: 'Token tidak valid' };
    if (payload.magicToken !== magicToken) return { ok: false, error: 'Link tidak valid' };
    return { ok: true, email: payload.email };
  } catch (e: any) {
    return { ok: false, error: e?.code === 'ERR_JWT_EXPIRED' ? 'Link sudah kedaluwarsa.' : 'Link tidak valid' };
  }
}

export async function sendVerificationEmail(email: string, code: string, magicToken: string, jwtToken: string): Promise<void> {
  const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
  const magicLink = `${BASE_URL}/auth/verify-email?jwt=${encodeURIComponent(jwtToken)}&magic=${magicToken}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  });

  const boxes = code.split('').map(ch =>
    `<td style="padding:0 4px"><div style="width:44px;height:56px;line-height:56px;text-align:center;background:rgba(124,58,237,.18);border:2px solid rgba(167,139,250,.6);border-radius:10px;color:#a78bfa;font-family:monospace;font-size:24px;font-weight:800">${ch}</div></td>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifikasi Email — Saturn Dashboard</title>
</head>
<body style="margin:0;padding:0;background:#04040d;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#04040d;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(124,58,237,.15);border:1px solid rgba(124,58,237,.35);border-radius:14px;padding:11px 20px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="font-size:20px;vertical-align:middle;padding-right:10px;">🚀</td>
                        <td style="color:#fff;font-family:Courier,monospace;font-weight:700;font-size:16px;letter-spacing:3px;vertical-align:middle;">SATURN DASHBOARD</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main card -->
          <tr>
            <td style="background:linear-gradient(135deg,rgba(124,58,237,.09),rgba(6,182,212,.05));border:1px solid rgba(124,58,237,.28);border-radius:22px;padding:40px 36px;text-align:center;">

              <!-- Email icon -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <div style="width:60px;height:60px;background:linear-gradient(135deg,#7c3aed,#0891b2);border-radius:18px;display:inline-flex;align-items:center;justify-content:center;font-size:28px;line-height:60px;text-align:center;">✉️</div>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 10px;">Verifikasi Email Kamu</h1>
                    <p style="color:rgba(255,255,255,.5);font-size:14px;margin:0 0 32px;line-height:1.65;">
                      Masukkan kode di bawah ini di halaman registrasi<br>Saturn Dashboard untuk memverifikasi emailmu.
                    </p>
                  </td>
                </tr>

                <!-- OTP Box -->
                <tr>
                  <td align="center" style="padding-bottom:28px;">
                    <table cellpadding="0" cellspacing="0" style="background:rgba(0,0,0,.4);border:2px solid rgba(124,58,237,.45);border-radius:16px;padding:18px 24px;">
                      <tr>
                        <td align="center" style="padding-bottom:12px;">
                          <span style="color:rgba(255,255,255,.4);font-size:10px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;">KODE VERIFIKASI</span>
                        </td>
                      </tr>
                      <tr>
                        <td align="center">
                          <table cellpadding="0" cellspacing="0">
                            <tr>
                              ${code.split('').map(ch =>
                                `<td style="padding:0 3px;"><div style="width:38px;height:50px;line-height:50px;background:rgba(124,58,237,.2);border:1.5px solid rgba(124,58,237,.5);border-radius:10px;color:#c4b5fd;font-family:Courier,monospace;font-size:22px;font-weight:700;text-align:center;">${ch}</div></td>`
                              ).join('')}
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td align="center" style="padding-top:12px;">
                          <span style="color:rgba(255,255,255,.25);font-size:11px;">Berlaku selama 10 menit</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Divider -->
                <tr>
                  <td align="center" style="padding-bottom:20px;">
                    <p style="color:rgba(255,255,255,.4);font-size:13px;margin:0;">Atau verifikasi otomatis tanpa ketik kode:</p>
                  </td>
                </tr>

                <!-- Magic Link Button -->
                <tr>
                  <td align="center" style="padding-bottom:24px;">
                    <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;text-decoration:none;padding:14px 32px;border-radius:13px;font-size:15px;font-weight:700;letter-spacing:.02em;box-shadow:0 6px 22px rgba(124,58,237,.45);">
                      ✅ VERIFY HERE — Klik untuk Verifikasi
                    </a>
                  </td>
                </tr>

                <!-- Footer note -->
                <tr>
                  <td align="center">
                    <p style="color:rgba(255,255,255,.18);font-size:11px;margin:0;line-height:1.7;">
                      Abaikan email ini jika kamu tidak mendaftar di Saturn Dashboard.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding-top:20px;">
              <p style="color:rgba(255,255,255,.12);font-size:11px;margin:0;">
                Saturn Dashboard &middot; Built by Dearly Febriano Irwansyah &copy; ${new Date().getFullYear()}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Saturn Dashboard 🚀" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: `${code} — Kode Verifikasi Saturn Dashboard`,
    html,
    text: `Kode: ${code}\n\nVerifikasi otomatis: ${magicLink}\n\nBerlaku 10 menit.`,
  });
}
