import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || user.role !== 'owner')
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({
      success:  true,
      version:  'v6.3.0',
      nextjs:   '16.2.0',
      nodeEnv:  process.env.NODE_ENV || 'production',
      platform: process.platform,
      uptime:   Math.floor(process.uptime()),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
