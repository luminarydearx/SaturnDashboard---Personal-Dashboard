import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServerById, updateWebServer } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

// GET /api/webserver/lockdown?id=memoire&branch=master
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get('id');
  const branch = searchParams.get('branch') || 'master';

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  try {
    const rawUrl = `https://raw.githubusercontent.com/${server.githubOwner}/${server.githubRepo}/${branch}/public/lockdown.json`;
    const res = await fetch(rawUrl + `?_=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ active: false });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ active: false });
  }
}

// POST /api/webserver/lockdown
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !['owner', 'co-owner'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id, action, reason, mediaUrl, branch = 'master' } = await req.json() as {
    id: string; action: 'lock' | 'unlock';
    reason?: string; mediaUrl?: string; branch?: string;
  };

  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });

  const payload = action === 'lock'
    ? { active: true, reason: reason || 'Maintenance', timestamp: new Date().toISOString(), ...(mediaUrl ? { mediaUrl } : {}) }
    : { active: false, reason: '', timestamp: new Date().toISOString() };

  try {
    await pushToGithub({ token, owner: server.githubOwner, repo: server.githubRepo, files: [{ path: 'public/lockdown.json', content: JSON.stringify(payload, null, 2) }], message: `${action === 'lock' ? '🔒' : '🔓'} ${action === 'lock' ? 'Lockdown' : 'Unlock'} ${server.name} [${branch}] via Saturn Dashboard`, branch: branch });

    // Only update local state for production branch
    if (branch === 'master') {
      updateWebServer(id, {
        lockdown: { active: action === 'lock', reason: reason || '', timestamp: new Date().toISOString(), mediaUrl },
      });
    }

    return NextResponse.json({ success: true, branch });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Push failed' }, { status: 500 });
  }
}
