import { logActivity } from '@/lib/activityLogger';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServerById, updateWebServer } from '@/lib/db';
import { pushToGithub } from '@/lib/github';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id     = searchParams.get('id');
  const branch = searchParams.get('branch') || 'master';

  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  // For master branch: return local DB state instantly (always accurate after push)
  if (branch === 'master' && server.lockdown) {
    return NextResponse.json(server.lockdown);
  }

  // For staging or missing DB state: fetch from GitHub raw URL
  try {
    const rawUrl = `https://raw.githubusercontent.com/${server.githubOwner}/${server.githubRepo}/${branch}/public/lockdown.json?_=${Date.now()}`;
    const res = await fetch(rawUrl, { cache: 'no-store' });
    if (!res.ok) return NextResponse.json({ active: false, reason: '', timestamp: '' });
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ active: false, reason: '', timestamp: '' });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !['owner', 'co-owner'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json() as {
    id: string; action: 'lock' | 'unlock';
    reason?: string; mediaUrl?: string;
    branch?: string; routes?: string[];
  };
  const { id, action, reason, mediaUrl, branch = 'master', routes } = body;

  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });

  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return NextResponse.json({ error: 'GitHub token not configured' }, { status: 500 });

  const activeRoutes = routes && routes.length > 0 ? routes : undefined;
  const now = new Date().toISOString();
  const payload = action === 'lock'
    ? {
        active: true,
        reason: reason || 'Maintenance',
        timestamp: now,
        ...(mediaUrl ? { mediaUrl } : {}),
        ...(activeRoutes ? { routes: activeRoutes } : {}),
      }
    : { active: false, reason: '', timestamp: now };

  const routeLabel = activeRoutes ? ` (routes: ${activeRoutes.join(', ')})` : '';
  try {
    await pushToGithub({
      token, owner: server.githubOwner, repo: server.githubRepo,
      files: [{ path: 'public/lockdown.json', content: JSON.stringify(payload, null, 2) }],
      message: `${action === 'lock' ? '🔒' : '🔓'} ${server.name}${routeLabel}: ${action} [${branch}] via Saturn`,
      branch,
    });

    // Always save to DB regardless of branch so state persists on reload
    updateWebServer(id, { lockdown: payload });
    logActivity({ category:'lockdown', action: action==='lock' ? 'LOCKDOWN_LOCK' : 'LOCKDOWN_UNLOCK', actor: user.username, actorRole: user.role, target: server.name, detail: `branch=${branch}${reason?`, reason=${reason}`:''}`, success: true });
    return NextResponse.json({ success: true, branch });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Push failed' }, { status: 500 });
  }
}
