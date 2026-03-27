import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { readFromGithub, writeToGithub } from '@/lib/githubData';
import type { AttendanceRecord } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const limit   = parseInt(req.nextUrl.searchParams.get('limit') || '200');
    const records = (await readFromGithub<AttendanceRecord[]>('attendance.json', [])).slice(0, limit);
    return NextResponse.json({ success: true, records, count: records.length });
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
    await writeToGithub('attendance.json', []);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
