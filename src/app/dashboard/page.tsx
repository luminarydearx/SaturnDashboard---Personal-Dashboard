import { getSession } from '@/lib/auth';
import { getUserById, getNotes, getUsers } from '@/lib/db';
import { redirect } from 'next/navigation';
import DashboardHome from './DashboardHome';

import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Main Dashboard' };

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');

  const notes = getNotes();
  const users = getUsers();

  const stats = {
    totalNotes: notes.length,
    myNotes: notes.filter((n) => n.authorId === user.id).length,
    totalUsers: users.length,
    activeUsers: users.filter((u) => !u.banned).length,
    hiddenNotes: notes.filter((n) => n.hidden).length,
  };

  const { password: _p, ...publicUser } = user!;
  return <DashboardHome user={publicUser} stats={stats} recentNotes={notes.slice(0, 5)} />;
}
