import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import AutoGenClient from './AutoGenClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'AutoGen' };

export default async function AutoGenPage() {
  const session = await getSession();
  if (!session) redirect('/');
  if (session.role !== 'owner' && session.role !== 'co-owner') redirect('/dashboard');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  const { password: _p, ...publicUser } = user!;
  return <AutoGenClient user={publicUser} />;
}
