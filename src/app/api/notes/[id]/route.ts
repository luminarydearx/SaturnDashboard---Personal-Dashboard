import { autoSyncToGithub } from '@/lib/github-auto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession, canManage } from '@/lib/auth';
import { getUserById, getNoteById, updateNote, deleteNote, purgeDoneNotes } from '@/lib/db';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  // Auto-purge done notes older than 24h
  purgeDoneNotes();

  const note = getNoteById(params.id);
  if (!note) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

  const body = await req.json();

  if (body.pinned !== undefined) {
    const updated = updateNote(params.id, { pinned: body.pinned });
    await autoSyncToGithub('Pin/unpin note');
    return NextResponse.json({ success: true, data: updated });
  }

  if (body.done !== undefined) {
    if (note.authorId !== user.id && user.role !== 'owner' && user.role !== 'co-owner') {
      return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });
    }
    const updated = updateNote(params.id, {
      done:   body.done,
      doneAt: body.done ? new Date().toISOString() : undefined,
    });
    await autoSyncToGithub('Mark note done');
    return NextResponse.json({ success: true, data: updated });
  }

  if (body.hidden !== undefined) {
    if (user.role !== 'owner' && user.role !== 'co-owner') {
      return NextResponse.json({ success: false, error: 'Only owner can hide/show notes' }, { status: 403 });
    }
    const updated = updateNote(params.id, {
      hidden: body.hidden,
      hiddenBy: body.hidden ? user.id : undefined,
    });
    await autoSyncToGithub('Update note visibility');
    return NextResponse.json({ success: true, data: updated });
  }

  if (note.authorId !== user.id) {
    return NextResponse.json({ success: false, error: 'You can only edit your own notes' }, { status: 403 });
  }

  const { title, content, images, tags, color } = body;
  const updated = updateNote(params.id, { title, content, images, tags, color });
  await autoSyncToGithub('Update note');
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });

  const note = getNoteById(params.id);
  if (!note) return NextResponse.json({ success: false, error: 'Note not found' }, { status: 404 });

  const isAuthor  = note.authorId === user.id;
  const canDelete = user.role === 'owner' || user.role === 'co-owner' ||
    (user.role === 'admin' && canManage(user.role, note.authorRole)) || isAuthor;

  if (!canDelete) return NextResponse.json({ success: false, error: 'Permission denied' }, { status: 403 });

  deleteNote(params.id);
  await autoSyncToGithub('Delete note');
  return NextResponse.json({ success: true, message: 'Note deleted' });
}
