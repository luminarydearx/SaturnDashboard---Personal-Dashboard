import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import SmartOverviewClient from './SmartOverviewClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Smart Overview' };
export default async function SmartOverviewPage() {
  const session = await getSession();
  if (!session) redirect('/login');
  const user = getUserById(session.userId);
  if (!user) redirect('/login');
  if (!['owner','co-owner','developer','admin'].includes(user.role)) redirect('/dashboard');
  const { password: _p, ...publicUser } = user!;
  return <SmartOverviewClient user={publicUser} />;
}
