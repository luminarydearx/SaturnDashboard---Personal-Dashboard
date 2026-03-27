import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { readFromGithub, writeToGithub } from '@/lib/githubData';
import type { ActivityLog, ActivityCategory } from '@/lib/activityLogger';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as ActivityCategory | null;
    const actor    = searchParams.get('actor') || undefined;
    const limit    = parseInt(searchParams.get('limit') || '200');

    // Always read from GitHub (source of truth in production)
    let logs = await readFromGithub<ActivityLog[]>('activity-logs.json', []);
    if (category) logs = logs.filter(l => l.category === category);
    if (actor)    logs = logs.filter(l => l.actor === actor);
    logs = logs.slice(0, limit);

    return NextResponse.json({ success: true, logs, count: logs.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || user.role !== 'owner')
      return NextResponse.json({ error: 'Only owner can clear logs' }, { status: 403 });

    await writeToGithub('activity-logs.json', []);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
