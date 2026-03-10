import { getSession } from '@/lib/auth';
import { getUserById, getBackups } from '@/lib/db';
import { redirect } from 'next/navigation';
import BackupClient from './BackupClient';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Backup' };

export default async function BackupPage() {
  const session = await getSession();
  if (!session) redirect('/');

  const user = getUserById(session.userId);
  if (!user) redirect('/');

  const allowedRoles = ['owner', 'co-owner', 'admin', 'developer'];
  if (!allowedRoles.includes(user.role)) redirect('/dashboard');

  const { password: _p, ...publicUser } = user;
  const backups = getBackups();
  return <BackupClient user={publicUser} initialBackups={backups} />;
}
