import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import AttendanceClient from './AttendanceClient';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Attendance — Saturn Dashboard' };
export default async function AttendancePage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user || !['owner','co-owner'].includes(user.role)) redirect('/dashboard');
  const { password: _p, ...publicUser } = user!;
  return <AttendanceClient user={publicUser} />;
}
