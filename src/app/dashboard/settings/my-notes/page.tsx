import { getSession } from '@/lib/auth';
import { getUserById, getNotes } from '@/lib/db';
import { redirect } from 'next/navigation';
import MyNotesClient from './MyNotesClient';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'My Notes' };

export default async function MyNotesPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  const { password: _p, ...publicUser } = user!;

  // Only pass notes authored by this user
  const allNotes = getNotes();
  const myNotes  = allNotes.filter(n => n.authorId === session.userId && !n.hidden);

  return (
    <MyNotesClient
      user={publicUser}
      initialNotes={myNotes}
      highlightId={(await searchParams)?.highlight}
    />
  );
}
