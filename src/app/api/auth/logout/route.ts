import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';

export async function POST() {
  await clearSessionCookie();
  // Return JSON only — let the client handle redirect
  // (NextResponse.redirect from API causes issues with fetch() in some browsers)
  return NextResponse.json({ success: true });
}

export async function GET() {
  await clearSessionCookie();
  return NextResponse.json({ success: true });
}
