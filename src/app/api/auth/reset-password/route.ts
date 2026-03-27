import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getUsers, saveUsers } from '@/lib/db';
import { verifyOTPCode, verifyMagicLinkToken } from '@/lib/emailVerification';
import { autoSyncToGithub } from '@/lib/github-auto';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { token, code, magicToken, newPassword, email } = await req.json() as {
      token?: string; code?: string; magicToken?: string; newPassword?: string; email?: string;
    };

    if (!token || !newPassword)
      return NextResponse.json({ error: 'Token dan password baru diperlukan' }, { status: 400 });
    if (newPassword.length < 6)
      return NextResponse.json({ error: 'Password min 6 karakter' }, { status: 400 });

    let verifiedEmail: string | undefined;

    if (magicToken) {
      const r = await verifyMagicLinkToken(token, magicToken);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      verifiedEmail = r.email;
    } else if (code && email) {
      const r = await verifyOTPCode(token, code);
      if (!r.ok) return NextResponse.json({ error: r.error }, { status: 400 });
      verifiedEmail = r.email;
      if (verifiedEmail?.toLowerCase() !== email.toLowerCase())
        return NextResponse.json({ error: 'Email tidak cocok' }, { status: 400 });
    } else {
      return NextResponse.json({ error: 'Kode atau magic token diperlukan' }, { status: 400 });
    }

    if (!verifiedEmail) return NextResponse.json({ error: 'Verifikasi gagal' }, { status: 400 });

    const user = getUserByEmail(verifiedEmail);
    if (!user) return NextResponse.json({ error: 'User tidak ditemukan' }, { status: 404 });

    const hashed = await bcrypt.hash(newPassword, 10);
    const users  = getUsers();
    const idx    = users.findIndex(u => u.id === user.id);
    if (idx >= 0) {
      users[idx].password  = hashed;
      users[idx].updatedAt = new Date().toISOString();
      saveUsers(users);
      autoSyncToGithub(`Password reset: ${user.username}`).catch(() => {});
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
