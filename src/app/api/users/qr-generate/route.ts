import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, updateUserQR } from '@/lib/db';
import { autoSyncToGithub } from '@/lib/github-auto';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || 'dg3awuzug';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

// Use production URL — MUST be set in Vercel env vars
// For local dev with phone scanning: set to your local network IP e.g. http://192.168.1.x:3000
const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ||
  process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
  'http://localhost:3000'
).replace(/\/$/, '');

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json() as { userId?: string };
    const targetId = body.userId || session.userId;

    const currentUser = getUserById(session.userId);
    if (!currentUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (targetId !== session.userId && !['owner', 'co-owner'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const targetUser = getUserById(targetId);
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Reuse existing stable token — only generate new if user has none
    const qrToken: string = (targetUser as any).qrToken || uuidv4().replace(/-/g, '');
    const qrLoginUrl = `${BASE_URL}/auth/qr-scan?token=${qrToken}`;

    // Generate QR as base64 PNG using qrcode npm package
    // errorCorrectionLevel H = 30% damage tolerance (needed for center logo overlay)
    // type imagemagick dark = black on white — standard, readable by all scanners
    const qrDataUrl: string = await QRCode.toDataURL(qrLoginUrl, {
      errorCorrectionLevel: 'H',
      type:    'image/png',
      margin:  2,
      width:   400,
      color: {
        dark:  '#000000',
        light: '#ffffff',
      },
    });

    // Upload QR to Cloudinary using FormData (safer than JSON for base64 data URLs)
    const formData = new FormData();
    formData.append('file', qrDataUrl);
    formData.append('upload_preset', UPLOAD_PRESET);

    const uploadRes = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
      { method: 'POST', body: formData }
    );

    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Cloudinary upload failed: ${err.slice(0, 200)}`);
    }

    const uploadData = await uploadRes.json();
    const qrCodeUrl: string = uploadData.secure_url;

    // Save token + URL to user record
    updateUserQR(targetId, qrCodeUrl, qrToken);

    return NextResponse.json({
      success:     true,
      qrCodeUrl,
      qrToken,
      qrLoginUrl,
      qrDataUrl,   // base64 PNG — used by client to render before Cloudinary
      baseUrl:     BASE_URL,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
