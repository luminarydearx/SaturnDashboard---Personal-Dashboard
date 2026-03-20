import { logActivity } from '@/lib/activityLogger';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByUsername } from '@/lib/db';
import { createToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ success: false, error: 'Username and password are required' }, { status: 400 });
    }

    const user = getUserByUsername(username);
    if (!user) {
      logActivity({ category:'auth', action:'AUTH_LOGIN_FAIL', actor: username as string, success: false, detail: 'User not found' });
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      logActivity({ category:'auth', action:'AUTH_LOGIN_FAIL', actor: username as string, success: false, detail: 'Wrong password' });
      return NextResponse.json({ success: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createToken({ userId: user.id, role: user.role, username: user.username });
    await setSessionCookie(token);

    logActivity({ category:'auth', action:'AUTH_LOGIN', actor: user.username, actorRole: user.role, success: true });
    const { password: _p, ...publicUser } = user;
    return NextResponse.json({ success: true, data: publicUser });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
