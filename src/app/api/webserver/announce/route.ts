import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServerById, updateWebServer } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

// GET /api/webserver/announce?id=memoire&branch=master
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get('id');
  const branch = searchParams.get('branch') || 'master';

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  try {
    const rawUrl = `https://raw.githubusercontent.com/${server.githubOwner}/${server.githubRepo}/${branch}/public/announce.json`;
    const res = await fetch(rawUrl + `?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ active: false, message: '', type: 'info' });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ active: false, message: '', type: 'info' });
  }
}

// POST /api/webserver/announce
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !['owner', 'co-owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, active, message, type, link, linkText, branch = 'master' } = await req.json() as {
    id: string; active: boolean; message: string;
    type: 'info'|'warning'|'success'|'error';
    link?: string; linkText?: string; branch?: string;
  };

  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });

  const payload = { active, message, type, link: link||'', linkText: linkText||'', updatedAt: new Date().toISOString() };

  try {
    await pushToGithub({ token, owner: server.githubOwner, repo: server.githubRepo, files: [{ path: 'public/announce.json', content: JSON.stringify(payload, null, 2) }], message: `📢 ${active ? 'Set' : 'Clear'} announcement [${branch}] via Saturn Dashboard`, branch: branch });

    if (branch === 'master') {
      updateWebServer(id, { announce: { active, message, type, link, linkText } });
    }

    return NextResponse.json({ success: true, branch });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Push failed' }, { status: 500 });
  }
}
