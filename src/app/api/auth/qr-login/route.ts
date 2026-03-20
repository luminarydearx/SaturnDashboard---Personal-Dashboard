import { NextRequest, NextResponse } from 'next/server';
import { getUserByQRToken, addAttendance } from '@/lib/db';
import { createToken, setSessionCookie } from '@/lib/auth';
import { logActivity } from '@/lib/activityLogger';
import { autoSyncToGithub } from '@/lib/github-auto';

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json() as { token: string };
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    const user = getUserByQRToken(token);
    if (!user) {
      logActivity({ category: 'auth', action: 'AUTH_QR_FAIL', actor: 'unknown', success: false, detail: `Invalid QR token: ${token.slice(0,8)}…` });
      return NextResponse.json({ error: 'QR code tidak valid atau sudah kadaluarsa' }, { status: 401 });
    }

    if (user.banned) {
      return NextResponse.json({ error: 'Akun ini dibanned' }, { status: 403 });
    }

    // Create JWT session
    const jwtToken = await createToken({ userId: user.id, role: user.role, username: user.username });
    await setSessionCookie(jwtToken);

    // Record attendance
    const record = {
      id:          Math.random().toString(36).slice(2, 10),
      userId:      user.id,
      username:    user.username,
      displayName: user.displayName,
      role:        user.role,
      avatar:      user.avatar || undefined,
      scannedAt:   new Date().toISOString(),
      ip:          req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined,
    };
    addAttendance(record);

    // Persist attendance + full db to GitHub (fire-and-forget)
    autoSyncToGithub(`QR login: ${user.username}`).catch(() => {});

    logActivity({ category: 'auth', action: 'AUTH_QR_LOGIN', actor: user.username, actorRole: user.role, success: true });

    const { password: _p, qrToken: _q, ...publicUser } = user as any;
    return NextResponse.json({ success: true, data: publicUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET: validate a QR token without logging in (for scan preview)
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');
    if (!token) return NextResponse.json({ error: 'Token required' }, { status: 400 });

    const user = getUserByQRToken(token);
    if (!user) return NextResponse.json({ error: 'Invalid token' }, { status: 404 });

    const { password: _p, qrToken: _q, ...publicUser } = user as any;
    return NextResponse.json({ success: true, user: publicUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
