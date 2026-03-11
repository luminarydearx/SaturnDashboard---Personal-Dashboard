import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { AuthSession } from '@/types';

export type { AuthSession };
export { canManage, roleColor, roleBadgeClass } from './auth.utils';

const JWT_SECRET = process.env.JWT_SECRET || 'saturn-dashboard-super-secret-key-2024';
const SECRET = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'saturn_session';

export async function createToken(payload: AuthSession): Promise<string> {
  return await new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifyToken(token: string): Promise<AuthSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload as unknown as AuthSession;
  } catch {
    return null;
  }
}

// ── Next.js 15/16: cookies() is now async — must be awaited ──────────────
export async function getSession(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
