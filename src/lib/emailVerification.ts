/**
 * emailVerification.ts
 *
 * ARCHITECTURE — Stateless, JWT-based OTP (works on Vercel serverless):
 *
 * 1. send-verification: generate OTP → hash it → sign into a JWT token
 *    → return token to client → client stores in sessionStorage
 *
 * 2. verify-code: client sends (token + otp code)
 *    → server verifies JWT signature + checks hash of code → no server state needed
 *
 * This works across ALL Vercel serverless invocations because there is no
 * shared state — the signed token IS the state.
 */

import nodemailer from 'nodemailer';
import { SignJWT, jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'saturn-dashboard-super-secret-key-2024';
const SECRET     = new TextEncoder().encode(JWT_SECRET + '-otp');
const CHARS      = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const OTP_TTL_S  = 600; // 10 minutes

function genCode(len = 6): string {
  let code = '';
  for (let i = 0; i < len; i++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
  return code;
}

async function hashCode(code: string, email: string): Promise<string> {
  // Simple but sufficient: HMAC the code+email with JWT_SECRET
  const data  = `${code.toUpperCase()}:${email.toLowerCase()}:${JWT_SECRET}`;
  const bytes = new TextEncoder().encode(data);
  const hash  = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Create OTP + return signed token ───────────────────────────────────────
export async function createOTPToken(email: string): Promise<{
  code: string;
  token: string;        // JWT — store on client side
  magicToken: string;   // for magic link (also in JWT)
}> {
  const code       = genCode(6);
  const magicToken = genCode(32).toLowerCase();
  const codeHash   = await hashCode(code, email);

  const token = await new SignJWT({
    email:      email.toLowerCase(),
    codeHash,
    magicToken,
    type:       'email-verify',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${OTP_TTL_S}s`)
    .sign(SECRET);

  return { code, token, magicToken };
}

// ── Verify OTP code ─────────────────────────────────────────────────────────
export async function verifyOTPCode(
  token: string,
  code: string
): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (payload.type !== 'email-verify' || typeof payload.email !== 'string')
      return { ok: false, error: 'Token tidak valid' };

    const expectedHash = await hashCode(code, payload.email);
    if (expectedHash !== payload.codeHash)
      return { ok: false, error: 'Kode tidak valid' };

    return { ok: true, email: payload.email };
  } catch (e: any) {
    if (e?.code === 'ERR_JWT_EXPIRED')
      return { ok: false, error: 'Kode sudah kedaluwarsa. Kirim ulang kode.' };
    return { ok: false, error: 'Token tidak valid' };
  }
}

// ── Verify magic link token ─────────────────────────────────────────────────
export async function verifyMagicLinkToken(
  jwtToken: string,
  magicToken: string
): Promise<{ ok: boolean; email?: string; error?: string }> {
  try {
    const { payload } = await jwtVerify(jwtToken, SECRET);
    if (payload.type !== 'email-verify' || typeof payload.email !== 'string')
      return { ok: false, error: 'Token tidak valid' };

    if (payload.magicToken !== magicToken)
      return { ok: false, error: 'Link tidak valid' };

    return { ok: true, email: payload.email };
  } catch (e: any) {
    if (e?.code === 'ERR_JWT_EXPIRED')
      return { ok: false, error: 'Link sudah kedaluwarsa. Minta kode baru.' };
    return { ok: false, error: 'Link tidak valid atau sudah kedaluwarsa' };
  }
}

// ── Send OTP email ──────────────────────────────────────────────────────────
export async function sendVerificationEmail(
  email: string, code: string, magicToken: string, jwtToken: string
): Promise<void> {
  const BASE_URL = (
    process.env.NEXT_PUBLIC_BASE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'http://localhost:3000'
  ).replace(/\/$/, '');

  // Magic link embeds BOTH the JWT token and the magicToken so server can verify stateless
  const magicLink = `${BASE_URL}/auth/verify-email?jwt=${encodeURIComponent(jwtToken)}&magic=${magicToken}`;

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER || 'dearlyfebrianoi@gmail.com',
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#04040d;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-flex;align-items:center;gap:10px;background:rgba(124,58,237,.12);border:1px solid rgba(124,58,237,.3);border-radius:14px;padding:10px 18px;">
        <span style="font-size:18px;">🚀</span>
        <span style="color:#fff;font-family:monospace;font-weight:700;font-size:15px;letter-spacing:3px;">SATURN DASHBOARD</span>
      </div>
    </div>
    <div style="background:linear-gradient(135deg,rgba(124,58,237,.08),rgba(6,182,212,.05));border:1px solid rgba(124,58,237,.25);border-radius:20px;padding:32px 24px;text-align:center;">
      <div style="width:52px;height:52px;background:linear-gradient(135deg,#7c3aed,#0891b2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:18px;">
        <span style="font-size:24px;line-height:1;">✉️</span>
      </div>
      <h1 style="color:#fff;font-size:20px;font-weight:700;margin:0 0 8px;">Verifikasi Email Kamu</h1>
      <p style="color:rgba(255,255,255,.5);font-size:13px;margin:0 0 24px;line-height:1.6;">
        Masukkan kode di bawah di halaman registrasi Saturn Dashboard.
      </p>
      <div style="background:rgba(0,0,0,.35);border:2px solid rgba(124,58,237,.4);border-radius:14px;padding:16px 20px;margin-bottom:20px;display:inline-block;">
        <p style="color:rgba(255,255,255,.4);font-size:10px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;margin:0 0 10px;">KODE VERIFIKASI</p>
        <div style="display:flex;gap:6px;justify-content:center;">
          ${code.split('').map(ch =>
            `<span style="display:inline-block;width:36px;height:46px;line-height:46px;background:rgba(124,58,237,.18);border:1px solid rgba(124,58,237,.45);border-radius:9px;color:#a78bfa;font-family:monospace;font-size:20px;font-weight:700;text-align:center;">${ch}</span>`
          ).join('')}
        </div>
        <p style="color:rgba(255,255,255,.25);font-size:11px;margin:10px 0 0;">Berlaku selama 10 menit</p>
      </div>
      <p style="color:rgba(255,255,255,.4);font-size:13px;margin:0 0 16px;">
        Atau verifikasi otomatis:
      </p>
      <a href="${magicLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#0891b2);color:#fff;text-decoration:none;padding:13px 28px;border-radius:12px;font-size:14px;font-weight:700;box-shadow:0 6px 20px rgba(124,58,237,.4);">
        ✅ VERIFY HERE — Klik untuk Verifikasi
      </a>
      <p style="color:rgba(255,255,255,.15);font-size:11px;margin:20px 0 0;line-height:1.6;">
        Abaikan email ini jika kamu tidak mendaftar di Saturn Dashboard.
      </p>
    </div>
    <p style="text-align:center;color:rgba(255,255,255,.12);font-size:11px;margin:18px 0 0;">
      Saturn Dashboard · Built by Dearly Febriano Irwansyah © ${new Date().getFullYear()}
    </p>
  </div>
</body>
</html>`;

  await transporter.sendMail({
    from: `"Saturn Dashboard 🚀" <${process.env.GMAIL_USER || 'dearlyfebrianoi@gmail.com'}>`,
    to: email,
    subject: `${code} — Kode Verifikasi Saturn Dashboard`,
    html,
    text: `Kode: ${code}\n\nVerifikasi otomatis: ${magicLink}\n\nBerlaku 10 menit.`,
  });
}
