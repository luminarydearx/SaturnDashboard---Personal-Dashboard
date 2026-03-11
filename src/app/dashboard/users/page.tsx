import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import UsersClient from './UsersClient';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'User Management' };

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ highlight?: string }>;
}) {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) redirect('/dashboard');
  const { password: _p, ...publicUser } = user;
  return <UsersClient currentUser={publicUser} highlightId={(await searchParams)?.highlight} />;
}
