import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServers, getAutogenLockdown, getAutogenAnnounce } from '@/lib/db';

const SERVERS = [
  {
    id:      'autogen',
    name:    'AutoGen',
    url:     process.env.NEXT_PUBLIC_AUTOGEN_URL || 'https://auto-generator-app.vercel.app',
    repo:    process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_REPO || 'AutoGenerator-App',
    stack:   'Vite + React',
    version: 'v1.x',
  },
  { id: 'memoire',  name: 'Memoire',  url: '', repo: '', stack: 'Next.js', version: 'v1.x' },
  { id: 'codelabx', name: 'CodeLabX', url: '', repo: '', stack: 'Next.js', version: 'v1.x' },
];

async function pingServer(url: string): Promise<{ online: boolean; ms: number; statusCode?: number }> {
  if (!url) return { online: false, ms: 0 };
  const start = Date.now();
  try {
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    return { online: res.status < 500, ms: Date.now() - start, statusCode: res.status };
  } catch { return { online: false, ms: Date.now() - start }; }
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !['owner','co-owner','developer','admin'].includes(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const dbServers = getWebServers();
  const autogenLock = getAutogenLockdown();
  const autogenAnn  = getAutogenAnnounce();

  // Merge stored server URLs with static config
  const enriched = SERVERS.map(s => {
    const db = dbServers.find(d => d.id === s.id || d.name.toLowerCase() === s.name.toLowerCase());
    return { ...s, url: db?.url || s.url, lockdown: db?.lockdown || (s.id === 'autogen' ? autogenLock : null), announce: db?.announce || (s.id === 'autogen' ? autogenAnn : null) };
  });

  // Ping all concurrently
  const pings = await Promise.all(enriched.map(s => pingServer(s.url)));

  const results = enriched.map((s, i) => ({
    id:         s.id,
    name:       s.name,
    url:        s.url,
    stack:      s.stack,
    version:    s.version,
    ping:       pings[i],
    status:     s.lockdown?.active ? 'maintenance' : pings[i].online ? 'active' : 'offline',
    lockdown:   s.lockdown,
    announce:   s.announce,
    checkedAt:  new Date().toISOString(),
  }));

  return NextResponse.json({ success: true, results, checkedAt: new Date().toISOString() });
}
