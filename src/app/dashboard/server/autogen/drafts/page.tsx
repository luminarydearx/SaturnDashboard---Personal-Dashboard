import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import DraftsClient from './DraftsClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'AutoGen Drafts' };

export default async function DraftsPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  if (!['owner','co-owner','admin'].includes(user.role)) redirect('/dashboard');
  const { password: _p, ...publicUser } = user;
  return <DraftsClient user={publicUser} />;
}
