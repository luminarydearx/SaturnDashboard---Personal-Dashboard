import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import DashboardShell from './DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/');

  const user = getUserById(session.userId);
  if (!user) redirect('/');

  const { password: _p, ...publicUser } = user!;

  return <DashboardShell user={publicUser}>{children}</DashboardShell>;
}
