import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import NotesClient from './NotesClient';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'All Notes' };

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  const { password: _p, ...publicUser } = user!;
  return <NotesClient user={publicUser} highlightId={(await searchParams)?.highlight} />;
}
