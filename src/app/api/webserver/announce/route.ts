import { logActivity } from '@/lib/activityLogger';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServerById, updateWebServer } from '@/lib/db';
import { pushToGithub } from '@/lib/github';
import { randomUUID } from 'crypto';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get('id');
  const branch = searchParams.get('branch') || 'master';

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // For master branch: return local DB state instantly (always accurate)
  if (branch === 'master' && server.announce) {
    return NextResponse.json(server.announce);
  }

  // For staging: fetch from GitHub
  try {
    const rawUrl = `https://raw.githubusercontent.com/${server.githubOwner}/${server.githubRepo}/${branch}/public/announce.json?_=${Date.now()}`;
    const res = await fetch(rawUrl, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ active: false, message: '', type: 'info' });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ active: false, message: '', type: 'info' });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !['owner', 'co-owner', 'admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    id: string; active: boolean; message: string;
    type: 'info'|'warning'|'success'|'error';
    link?: string; linkText?: string; branch?: string;
  };
  const { id, active, message, type, link, linkText, branch = 'master' } = body;

  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });

  const announceId = active ? randomUUID() : '';
  const payload = {
    active, message, type,
    link: link || '', linkText: linkText || '',
    id: announceId,
    updatedAt: new Date().toISOString(),
  };

  try {
    await pushToGithub({
      token, owner: server.githubOwner, repo: server.githubRepo,
      files: [{ path: 'public/announce.json', content: JSON.stringify(payload, null, 2) }],
      message: `📢 ${active ? 'Set' : 'Clear'} announcement [${branch}] via Saturn`,
      branch,
    });

    // Always save to DB so state persists on reload
    updateWebServer(id, { announce: { active, message, type, link, linkText, id: announceId } });
    logActivity({ category:'announce', action: active ? 'ANNOUNCE_SET' : 'ANNOUNCE_CLEAR', actor: user.username, actorRole: user.role, target: server.name, detail: active ? message.slice(0,80) : undefined, success: true });
    return NextResponse.json({ success: true, branch });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Push failed' }, { status: 500 });
  }
}
