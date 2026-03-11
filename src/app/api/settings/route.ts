import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getSettings, saveSettings } from '@/lib/db';

// GET /api/settings — return settings (token masked)
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const settings = getSettings();
    return NextResponse.json({
      githubOwner: settings.githubOwner,
      githubRepo: settings.githubRepo,
      lastPush: settings.lastPush,
      // Only indicate if token is set, never expose the actual token
      hasToken: !!settings.githubToken,
      tokenPreview: settings.githubToken
        ? settings.githubToken.slice(0, 8) + '••••••••' + settings.githubToken.slice(-4)
        : '',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/settings — save github token and repo info
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const current = getSettings();

    const updated = {
      ...current,
      ...(body.githubToken    ? { githubToken:  body.githubToken.trim()  } : {}),
      ...(body.githubOwner    ? { githubOwner:  body.githubOwner.trim()  } : {}),
      ...(body.githubRepo     ? { githubRepo:   body.githubRepo.trim()   } : {}),
    };

    saveSettings(updated);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
