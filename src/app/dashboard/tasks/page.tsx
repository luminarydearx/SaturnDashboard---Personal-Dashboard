import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import TasksClient from './TasksClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Work Assignment' };
export default async function TasksPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const user = getUserById(session.userId);
  if (!user) redirect('/login');
  const allowed = ['owner','co-owner','admin','developer'];
  if (!allowed.includes(user.role)) redirect('/dashboard');
  const { password: _p, ...publicUser } = user!;
  return <TasksClient user={publicUser} />;
}
