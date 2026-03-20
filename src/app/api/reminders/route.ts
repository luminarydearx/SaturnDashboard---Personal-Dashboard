import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, readJson, writeJson } from '@/lib/db';

export interface Reminder {
  id:        string;
  title:     string;
  body?:     string;
  dueAt:     string;  // ISO
  done:      boolean;
  priority:  'low' | 'medium' | 'high';
  owner:     string;  // userId — only creator sees their own
  createdAt: string;
}

function getReminders(userId: string): Reminder[] {
  const all = readJson<Reminder[]>('reminders.json', []);
  return all.filter(r => r.owner === userId);
}

function saveReminder(r: Reminder) {
  const all = readJson<Reminder[]>('reminders.json', []);
  const idx = all.findIndex(x => x.id === r.id);
  if (idx >= 0) all[idx] = r; else all.unshift(r);
  writeJson('reminders.json', all.slice(0, 500));
}

function deleteReminder(id: string) {
  const all = readJson<Reminder[]>('reminders.json', []);
  writeJson('reminders.json', all.filter(r => r.id !== id));
}

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const reminders = getReminders(user.id).sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
  });
  return NextResponse.json({ success: true, reminders });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as Partial<Reminder>;
  if (!body.title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 });
  if (!body.dueAt)          return NextResponse.json({ error: 'Due date required' }, { status: 400 });

  const r: Reminder = {
    id:        Math.random().toString(36).slice(2, 10),
    title:     body.title.trim(),
    body:      body.body?.trim() || undefined,
    dueAt:     body.dueAt,
    done:      false,
    priority:  body.priority || 'medium',
    owner:     user.id,
    createdAt: new Date().toISOString(),
  };
  saveReminder(r);
  return NextResponse.json({ success: true, reminder: r });
}

export async function PATCH(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json() as { id: string; done?: boolean; title?: string; dueAt?: string; priority?: Reminder['priority'] };
  const all = readJson<Reminder[]>('reminders.json', []);
  const r = all.find(x => x.id === body.id && x.owner === user.id);
  if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.done      !== undefined) r.done     = body.done;
  if (body.title)                   r.title    = body.title;
  if (body.dueAt)                   r.dueAt    = body.dueAt;
  if (body.priority)                r.priority = body.priority;
  writeJson('reminders.json', all);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await req.json() as { id: string };
  deleteReminder(id);
  return NextResponse.json({ success: true });
}
