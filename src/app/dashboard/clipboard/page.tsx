import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import ClipboardClient from './ClipboardClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Team Clipboard' };
export default async function ClipboardPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  const { password: _p, ...publicUser } = user;
  return <ClipboardClient user={publicUser} />;
}
