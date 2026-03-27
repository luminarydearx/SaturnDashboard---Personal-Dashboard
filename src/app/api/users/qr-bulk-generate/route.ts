import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getUsers, updateUserQR } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || 'dg3awuzug';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';
const BASE_URL = (
  process.env.NEXT_PUBLIC_BASE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'http://localhost:3000'
).replace(/\/$/, '');

export async function POST() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const actor = getUserById(session.userId);
    if (!actor || actor.role !== 'owner')
      return NextResponse.json({ error: 'Only owner can bulk-regenerate QR codes' }, { status: 403 });

    const users = getUsers();
    let success = 0;
    let failed  = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        // Always generate fresh token on bulk regen
        const qrToken    = uuidv4().replace(/-/g, '');
        const qrLoginUrl = `${BASE_URL}/auth/qr-scan?token=${qrToken}`;

        const qrDataUrl: string = await QRCode.toDataURL(qrLoginUrl, {
          errorCorrectionLevel: 'H',
          type: 'image/png',
          margin: 2,
          width: 400,
          color: { dark: '#000000', light: '#ffffff' },
        });

        // Upload to Cloudinary via FormData
        const fd = new FormData();
        fd.append('file', qrDataUrl);
        fd.append('upload_preset', UPLOAD_PRESET);

        const res = await fetch(
          `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
          { method: 'POST', body: fd }
        );

        if (!res.ok) throw new Error(`Cloudinary failed for ${user.username}`);
        const data = await res.json();

        updateUserQR(user.id, data.secure_url, qrToken);
        success++;
      } catch (e: any) {
        failed++;
        errors.push(`${user.username}: ${e.message}`);
      }
    }

    return NextResponse.json({ success: true, generated: success, failed, errors });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
