import { getSession } from '@/lib/auth';
import { getUserById } from '@/lib/db';
import { redirect } from 'next/navigation';
import WebServerPanel from '@/components/webserver/WebServerPanel';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'CodeLabX — Web Server' };

const CODELABX_CONFIG = {
  id:             'codelabx',
  name:           'CodeLabX',
  url:            'https://code-lab-x.vercel.app',
  githubOwner:    'luminarydearx',
  githubRepo:     'CodeLabX',
  vercelProjectId: process.env.VERCEL_CODELABX_PROJECT_ID || '',
};

export default async function CodeLabXPage() {
  const session = await getSession();
  if (!session) redirect('/');
  const user = getUserById(session.userId);
  if (!user) redirect('/');
  if (!['owner', 'co-owner', 'admin'].includes(user.role)) redirect('/dashboard');
  const { password: _p, ...publicUser } = user;

  return (
    <div className="max-w-3xl mx-auto space-y-4 pb-10">
      <div>
        <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">CodeLabX</h1>
        <p className="text-[var(--c-muted)] text-sm mt-1 font-nunito">
          Control panel — lockdown, announcement, analytics & schedule
        </p>
      </div>
      <WebServerPanel user={publicUser} config={CODELABX_CONFIG} />
    </div>
  );
}
