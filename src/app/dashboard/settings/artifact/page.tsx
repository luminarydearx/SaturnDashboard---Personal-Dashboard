import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import ArtifactClient from './ArtifactClient';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Artifact' };

export default async function ArtifactPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  const { password: _p, ...publicUser } = user;
  return <ArtifactClient user={publicUser} />;
}
