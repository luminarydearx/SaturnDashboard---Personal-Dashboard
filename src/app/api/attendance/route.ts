import { autoSyncToGithub } from '@/lib/github-auto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getAttendance, writeJson } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '200');
    const all   = getAttendance().slice(0, limit);
    return NextResponse.json({ success: true, records: all, count: all.length });
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
      return NextResponse.json({ error: 'Only owner' }, { status: 403 });
    writeJson('attendance.json', []);
    autoSyncToGithub('auto-sync: attendance cleared').catch(() => {});
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
