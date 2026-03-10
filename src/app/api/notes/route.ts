import { autoSyncToGithub } from '@/lib/github-auto';
import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { getSession } from '@/lib/auth';
import { getUserById, getNotes, createNote } from '@/lib/db';
import type { Note } from '@/types';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  let notes = getNotes();

  // Filter by role
  if (user.role === 'owner') {
    // See all (including hidden)
  } else if (user.role === 'admin') {
    // See own + all user notes, exclude hidden unless author
    notes = notes.filter((n) => !n.hidden || n.authorId === user.id);
  } else {
    // See own notes only (non-hidden)
    notes = notes.filter((n) => n.authorId === user.id && !n.hidden);
  }

  return NextResponse.json({ success: true, data: notes });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  if (user.banned) return NextResponse.json({ success: false, error: 'Account banned' }, { status: 403 });

  const body = await req.json();
  const { title, content, images = [], tags = [], color = 'violet' } = body;

  if (!title?.trim()) return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });

  const now = new Date().toISOString();
  const note: Note = {
    id: uuidv4(),
    title: title.trim(),
    content: content?.trim() || '',
    images,
    tags,
    color,
    authorId: user.id,
    authorName: user.username,
    authorRole: user.role,
    hidden: false,
    createdAt: now,
    updatedAt: now,
  };

  const created = createNote(note);
  await autoSyncToGithub('Create note');
  return NextResponse.json({ success: true, data: created });
}
