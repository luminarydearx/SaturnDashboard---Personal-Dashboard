import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, readJson, writeJson } from '@/lib/db';

export interface ClipItem {
  id:        string;
  content:   string;
  label?:    string;
  type:      'text' | 'link' | 'code';
  author:    string;
  createdAt: string;
  pinned:    boolean;
}

function getClips(): ClipItem[] { return readJson<ClipItem[]>('clipboard.json', []); }
function saveClips(items: ClipItem[]) { writeJson('clipboard.json', items); }

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json({ success: true, clips: getClips() });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { content: string; label?: string; type?: 'text'|'link'|'code' };
  if (!body.content?.trim()) return NextResponse.json({ error: 'Content required' }, { status: 400 });

  const item: ClipItem = {
    id:        Math.random().toString(36).slice(2, 10),
    content:   body.content.trim(),
    label:     body.label?.trim() || undefined,
    type:      body.type || 'text',
    author:    user.username,
    createdAt: new Date().toISOString(),
    pinned:    false,
  };
  const clips = getClips();
  clips.unshift(item);
  saveClips(clips.slice(0, 200));
  return NextResponse.json({ success: true, item });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json() as { id: string; pinned?: boolean; label?: string };
  const clips = getClips();
  const idx = clips.findIndex(c => c.id === body.id);
  if (idx < 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (body.pinned !== undefined) clips[idx].pinned = body.pinned;
  if (body.label !== undefined) clips[idx].label = body.label;
  saveClips(clips);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json() as { id?: string };
  const clips = getClips();
  saveClips(body.id ? clips.filter(c => c.id !== body.id) : []);
  return NextResponse.json({ success: true });
}
