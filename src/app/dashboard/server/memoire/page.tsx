import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import WebServerPanel from '@/components/webserver/WebServerPanel';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Memoire — Web Server' };

const MEMOIRE_CONFIG = {
  id:              'memoire',
  name:            'Memoire',
  url:             'https://memoirepersonal.vercel.app',
  githubOwner:     'luminarydearx',
  githubRepo:      'Memoire',
  vercelProjectId: process.env.VERCEL_MEMOIRE_PROJECT_ID || 'prj_LpWX4OLwSAixhd6qhzcTAZCtUUOL',
};

export default async function MemoirePage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  if (!['owner', 'co-owner', 'admin'].includes(user.role)) redirect('/dashboard');
  const { password: _p, ...publicUser } = user!;
  return <WebServerPanel user={publicUser} config={MEMOIRE_CONFIG} />;
}
