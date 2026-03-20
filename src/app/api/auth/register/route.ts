import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUsers, getUserByUsername, getUserByEmail, saveUsers } from '@/lib/db';
import { createToken, setSessionCookie } from '@/lib/auth';
import { verifyOTPCode } from '@/lib/emailVerification';
import { logActivity } from '@/lib/activityLogger';
import { autoSyncToGithub } from '@/lib/github-auto';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      username?: string; password?: string; email?: string;
      firstName?: string; lastName?: string; phone?: string;
      displayName?: string; otpToken?: string; otpCode?: string;
    };

    const { username, password, email, firstName, lastName, phone, displayName, otpToken, otpCode } = body;

    if (!username || !password || !email)
      return NextResponse.json({ error: 'Username, password & email wajib diisi' }, { status: 400 });
    if (username.length < 3)
      return NextResponse.json({ error: 'Username min 3 karakter' }, { status: 400 });
    if (password.length < 6)
      return NextResponse.json({ error: 'Password min 6 karakter' }, { status: 400 });

    // Email verification check (stateless JWT)
    if (!otpToken || !otpCode) {
      return NextResponse.json({
        error: 'Verifikasi email diperlukan. Kembali ke step verifikasi.',
      }, { status: 400 });
    }

    const verifyResult = await verifyOTPCode(otpToken, otpCode);
    if (!verifyResult.ok) {
      return NextResponse.json({ error: verifyResult.error || 'Verifikasi email gagal' }, { status: 400 });
    }

    if (verifyResult.email?.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json({ error: 'Email tidak cocok dengan yang diverifikasi' }, { status: 400 });
    }

    // Check duplicate
    if (getUserByUsername(username as string))
      return NextResponse.json({ error: 'Username sudah dipakai' }, { status: 400 });
    if (getUserByEmail(email as string))
      return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 400 });

    // Create user
    const hashed = await bcrypt.hash(password as string, 10);
    const now    = new Date().toISOString();
    const newUser: User = {
      id:          `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      username:    (username as string).toLowerCase().trim(),
      displayName: displayName || `${firstName || ''} ${lastName || ''}`.trim() || (username as string),
      firstName:   firstName || '',
      lastName:    lastName  || '',
      email:       (email as string).toLowerCase().trim(),
      phone:       phone || '',
      bio:         '',
      avatar:      '',
      role:        'user',
      password:    hashed,
      banned:      false,
      createdAt:   now,
      updatedAt:   now,
    };

    const users = getUsers();
    users.push(newUser);
    saveUsers(users);

    const jwtToken = await createToken({ userId: newUser.id, role: newUser.role, username: newUser.username });
    await setSessionCookie(jwtToken);

    logActivity({ category: 'user', action: 'USER_CREATE', actor: newUser.username, actorRole: newUser.role, success: true });
    await autoSyncToGithub(`Register user: ${newUser.username}`);

    const { password: _p, ...publicUser } = newUser;
    return NextResponse.json({ success: true, data: publicUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
