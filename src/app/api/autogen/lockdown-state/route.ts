import { logActivity } from '@/lib/activityLogger';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getAutogenLockdown, saveAutogenLockdown, AutogenLockdown } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(getAutogenLockdown());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json() as AutogenLockdown;
    saveAutogenLockdown(body);
    const u = getUserById(session.userId);
    logActivity({ category:'lockdown', action: body.active ? 'LOCKDOWN_LOCK' : 'LOCKDOWN_UNLOCK', actor: u?.username ?? session.userId, actorRole: u?.role, target: 'AutoGen', detail: body.reason || undefined, success: true });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
