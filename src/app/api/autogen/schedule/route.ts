import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getAutogenSchedule, saveAutogenSchedule, AutogenSchedule } from '@/lib/db';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(getAutogenSchedule());
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || (user.role !== 'owner' && user.role !== 'co-owner'))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json() as AutogenSchedule;
    saveAutogenSchedule(body);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
