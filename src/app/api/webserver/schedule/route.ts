import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServerById, updateWebServer } from '@/lib/db';
import type { WebServerSchedule } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const server = getWebServerById(id);
  if (!server) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(server.schedule);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user || !['owner', 'co-owner'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { id, schedule } = await req.json() as { id: string; schedule: WebServerSchedule };
  const server = updateWebServer(id, { schedule });
  if (!server) return NextResponse.json({ error: 'Server not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
