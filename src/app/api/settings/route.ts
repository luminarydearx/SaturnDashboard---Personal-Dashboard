import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getSettings, saveSettings, getGithubToken } from '@/lib/db';

// GET /api/settings — token status always from ENV, never from file
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings  = getSettings();
    const envToken  = getGithubToken(); // reads process.env.GITHUB_TOKEN
    const hasToken  = !!envToken;
    const tokenPreview = hasToken
      ? envToken.slice(0, 8) + '••••••••' + envToken.slice(-4)
      : '';

    return NextResponse.json({
      githubOwner:  settings.githubOwner  || process.env.NEXT_PUBLIC_GITHUB_OWNER || '',
      githubRepo:   settings.githubRepo   || process.env.NEXT_PUBLIC_GITHUB_REPO  || '',
      lastPush:     settings.lastPush,
      hasToken,
      tokenPreview,
      tokenSource: hasToken ? 'env' : 'missing',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/settings — saves owner/repo metadata only, NEVER the token
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body    = await req.json();
    const current = getSettings();

    // Explicitly drop githubToken — it lives in env only
    const updated = {
      ...current,
      ...(body.githubOwner ? { githubOwner: String(body.githubOwner).trim() } : {}),
      ...(body.githubRepo  ? { githubRepo:  String(body.githubRepo).trim()  } : {}),
    };

    saveSettings(updated);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
