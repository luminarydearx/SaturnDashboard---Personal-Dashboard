import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServerById } from '@/lib/db';

// GET /api/webserver/analytics?id=memoire&period=7d
export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const id     = searchParams.get('id');
  const period = searchParams.get('period') || '7d';

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const vercelToken     = process.env.VERCEL_TOKEN || '';
  const projectId       = server.vercelProjectId;

  if (!vercelToken || !projectId) {
    return NextResponse.json({ error: 'Vercel token or project ID not configured', mock: true, data: generateMockData(period) });
  }

  try {
    // Vercel Web Analytics endpoint
    const days = period === '30d' ? 30 : period === '14d' ? 14 : 7;
    const now   = Date.now();
    const from  = now - days * 24 * 60 * 60 * 1000;

    const res = await fetch(
      `https://vercel.com/api/web/insights/stats/pageviews?projectId=${projectId}&from=${from}&to=${now}&environment=production`,
      {
        headers: {
          Authorization: `Bearer ${vercelToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!res.ok) {
      // Fallback to mock if analytics API not accessible
      return NextResponse.json({ mock: true, data: generateMockData(period) });
    }

    const raw = await res.json();
    return NextResponse.json({ mock: false, data: raw });
  } catch {
    return NextResponse.json({ mock: true, data: generateMockData(period) });
  }
}

function generateMockData(period: string) {
  const days = period === '30d' ? 30 : period === '14d' ? 14 : 7;
  const data = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const label = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    data.push({
      date:      label,
      views:     Math.floor(Math.random() * 180 + 40),
      visitors:  Math.floor(Math.random() * 90 + 20),
      sessions:  Math.floor(Math.random() * 110 + 30),
    });
  }
  return data;
}
