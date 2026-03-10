import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import ProfileClient from '@/app/dashboard/profile/ProfileClient';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Profile' };

export default async function SettingsProfilePage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  const { password: _p, ...publicUser } = user;
  return <ProfileClient user={publicUser} />;
}
