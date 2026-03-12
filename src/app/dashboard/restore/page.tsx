import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import RestoreClient from './RestoreClient';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Restore Data' };

export default async function RestorePage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user || user.role !== 'owner') redirect('/dashboard');
  const { password: _p, ...publicUser } = user;
  return <RestoreClient user={publicUser} />;
}
