import { getSession } from '@/lib/auth';
import { getUserById, getSettings } from '@/lib/db';
import { redirect } from 'next/navigation';
import SettingsClient from './SettingsClient';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Server Settings' };

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user || user.role !== 'owner') redirect('/dashboard');
  const settings = getSettings();
  const { password: _p, ...publicUser } = user!;
  return <SettingsClient user={publicUser} settings={settings} />;
}
