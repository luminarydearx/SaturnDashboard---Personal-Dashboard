import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getNotes, getUsers } from '@/lib/db';

const PRIVILEGED: string[] = ['owner', 'co-owner'];

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  const user = getUserById(session.userId);
  if (!user) return NextResponse.json({ success: false }, { status: 404 });

  const q = req.nextUrl.searchParams.get('q')?.trim().toLowerCase() || '';
  if (!q || q.length < 2) return NextResponse.json({ success: true, data: { notes: [], users: [] } });

  // ── Notes ──────────────────────────────────────────────────────────────
  const allNotes = getNotes();
  const visibleNotes = PRIVILEGED.includes(user.role) ? allNotes
    : user.role === 'admin' ? allNotes.filter(n => !n.hidden || n.authorId === user.id)
    : allNotes.filter(n => n.authorId === user.id && !n.hidden);

  const notes = visibleNotes.filter(n =>
    n.title.toLowerCase().includes(q) ||
    n.content.toLowerCase().includes(q) ||
    n.authorName.toLowerCase().includes(q) ||
    (n.tags ?? []).some((t: string) => t.toLowerCase().includes(q))
  ).slice(0, 6).map(n => ({
    id: n.id, title: n.title,
    content: n.content.slice(0, 300) + (n.content.length > 300 ? '…' : ''),
    authorName: n.authorName, authorRole: n.authorRole,
    color: n.color, hidden: n.hidden, pinned: (n as any).pinned ?? false,
    tags: n.tags ?? [], createdAt: n.createdAt,
  }));

  // ── Users ───────────────────────────────────────────────────────────────
  // - Never show yourself in search results
  // - Never show owner/co-owner accounts to lower roles
  const allUsers = getUsers();
  const searchable = allUsers.filter(u => {
    if (u.id === user.id) return false; // never show self
    // Only owner/co-owner can see other privileged accounts
    if (PRIVILEGED.includes(u.role) && !PRIVILEGED.includes(user.role)) return false;
    // Roles that can search: owner/co-owner see all, admin sees user/developer, user sees nobody else
    if (PRIVILEGED.includes(user.role)) return true;
    if (user.role === 'admin') return u.role === 'user' || u.role === 'developer';
    return false;
  });

  const users = searchable.filter(u =>
    u.username.toLowerCase().includes(q) ||
    (u.displayName || '').toLowerCase().includes(q) ||
    (u.email || '').toLowerCase().includes(q) ||
    (u.firstName || '').toLowerCase().includes(q) ||
    (u.lastName || '').toLowerCase().includes(q)
  ).slice(0, 5).map(({ password: _p, ...pub }) => pub);

  return NextResponse.json({ success: true, data: { notes, users } });
}
