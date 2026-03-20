import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServers, getAutogenLockdown, getAutogenAnnounce } from '@/lib/db';

const AUTOGEN_URL = process.env.NEXT_PUBLIC_AUTOGEN_URL || 'https://auto-generator-app.vercel.app';

async function pingUrl(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`${url}?_ping=${Date.now()}`, {
      cache: 'no-store', signal: AbortSignal.timeout(5000),
    });
    return { ok: res.ok || res.status < 500, ms: Date.now() - start };
  } catch {
    return { ok: false, ms: Date.now() - start };
  }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !['owner','co-owner','developer'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const servers = getWebServers();
  const autogenLock = getAutogenLockdown();
  const autogenAnn  = getAutogenAnnounce();

  // Ping all servers concurrently
  const pings = await Promise.all([
    pingUrl(AUTOGEN_URL),
    ...servers.map(s => pingUrl(s.url)),
  ]);

  const results = [
    {
      id:       'autogen',
      name:     'AutoGen',
      url:      AUTOGEN_URL,
      ping:     pings[0],
      lockdown: autogenLock,
      announce: autogenAnn,
      branch:   'master',
    },
    ...servers.map((s, i) => ({
      id:       s.id,
      name:     s.name,
      url:      s.url,
      ping:     pings[i + 1],
      lockdown: s.lockdown,
      announce: s.announce,
      branch:   'master',
    })),
  ];

  return NextResponse.json({ success: true, results, checkedAt: new Date().toISOString() });
}
