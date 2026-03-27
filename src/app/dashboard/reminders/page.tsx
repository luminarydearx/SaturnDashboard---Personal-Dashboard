import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import RemindersClient from './RemindersClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Reminders' };
export default async function RemindersPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  const { password: _p, ...publicUser } = user!;
  return <RemindersClient user={publicUser} />;
}
