import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';

const AUTOGEN_PROJECT_ID = process.env.VERCEL_AUTOGEN_PROJECT_ID || '';
const VERCEL_TOKEN       = process.env.VERCEL_TOKEN || '';

function generateMockData(days: number) {
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const base = 40 + Math.floor(Math.random() * 80);
    data.push({
      date: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }),
      views:    base + Math.floor(Math.random() * 30),
      visitors: Math.floor(base * 0.65) + Math.floor(Math.random() * 20),
      sessions: Math.floor(base * 0.8)  + Math.floor(Math.random() * 15),
    });
  }
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // period comes from query string - non-sensitive routing param only
    const period    = req.nextUrl.searchParams.get('period') || '7d';
    const days      = period === '30d' ? 30 : period === '14d' ? 14 : 7;

    // If Vercel token + project ID are set, use real API
    if (VERCEL_TOKEN && AUTOGEN_PROJECT_ID) {
      try {
        const since = new Date(Date.now() - days * 86400_000).toISOString();
        const res = await fetch(
          `https://api.vercel.com/v1/analytics/events?projectId=${AUTOGEN_PROJECT_ID}&since=${since}&limit=${days * 24}`,
          { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }, cache: 'no-store' }
        );
        if (res.ok) {
          const raw = await res.json();
          // Group by day
          const map: Record<string, { views: number; visitors: Set<string>; sessions: number }> = {};
          for (const e of raw.events ?? []) {
            const day = new Date(e.createdAt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
            if (!map[day]) map[day] = { views: 0, visitors: new Set(), sessions: 0 };
            map[day].views++;
            if (e.sessionId) { map[day].visitors.add(e.sessionId); map[day].sessions++; }
          }
          const data = Object.entries(map).map(([date, v]) => ({
            date, views: v.views, visitors: v.visitors.size, sessions: v.sessions,
          }));
          return NextResponse.json({ data, mock: false });
        }
      } catch { /* fall through to mock */ }
    }

    // Fallback: mock data
    return NextResponse.json({ data: generateMockData(days), mock: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
