import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import ActivityClient from './ActivityClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Activity Logs' };

export default async function ActivityPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  if (!['owner','co-owner','admin'].includes(user.role)) redirect('/dashboard');
  const { password: _p, ...publicUser } = user!;
  return <ActivityClient user={publicUser} />;
}
