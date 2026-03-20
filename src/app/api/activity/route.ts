import { autoSyncToGithub } from '@/lib/github-auto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { getActivityLogs, clearActivityLogs, ActivityCategory } from '@/lib/activityLogger';

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

    const logs = getActivityLogs({ category: category ?? undefined, actor, limit });
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

    clearActivityLogs();
    autoSyncToGithub('auto-sync: activity logs cleared').catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
