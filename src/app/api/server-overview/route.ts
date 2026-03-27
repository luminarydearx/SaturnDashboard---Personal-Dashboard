import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getUserById, getWebServers } from '@/lib/db';

const AUTOGEN_URL = process.env.NEXT_PUBLIC_AUTOGEN_URL || 'https://auto-generator-app.vercel.app';
const VERCEL_TOKEN = process.env.VERCEL_TOKEN || '';

const PROJECTS = [
  {
    id: 'autogen',
    name: 'AutoGen',
    url: AUTOGEN_URL,
    repo: process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_REPO || 'AutoGenerator-App',
    owner: process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_OWNER || 'luminarydearx',
    color: '#7c3aed',
  },
  {
    id: 'memoire',
    name: 'Memoire',
    url: 'https://memoirepersonal.vercel.app',
    repo: 'Memoire',
    owner: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'luminarydearx',
    color: '#0891b2',
  },
  {
    id: 'codelabx',
    name: 'CodeLabX',
    url: 'https://codelabx.vercel.app',
    repo: 'CodeLabX',
    owner: process.env.NEXT_PUBLIC_GITHUB_OWNER || 'luminarydearx',
    color: '#059669',
  },
];

async function pingProject(url: string): Promise<{ ok: boolean; ms: number; status: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      cache: 'no-store', signal: AbortSignal.timeout(6000),
      headers: { 'User-Agent': 'SaturnDashboard/1.0' },
    });
    return { ok: res.ok || res.status < 500, ms: Date.now() - start, status: res.status };
  } catch {
    return { ok: false, ms: Date.now() - start, status: 0 };
  }
}

async function getGithubInfo(owner: string, repo: string) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  try {
    const [repoRes, commitRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
        cache: 'no-store',
      }),
      fetch(`https://api.github.com/repos/${owner}/${repo}/commits?per_page=1`, {
        headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
        cache: 'no-store',
      }),
    ]);
    const repoData   = repoRes.ok   ? await repoRes.json()   : null;
    const commitData = commitRes.ok ? await commitRes.json() : null;
    return {
      stars:      repoData?.stargazers_count ?? 0,
      forks:      repoData?.forks_count ?? 0,
      language:   repoData?.language ?? 'Unknown',
      lastCommit: commitData?.[0]?.commit?.author?.date ?? null,
      lastMsg:    commitData?.[0]?.commit?.message?.split('\n')[0] ?? '',
    };
  } catch { return null; }
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const user = getUserById(session.userId);
    if (!user || !['owner','co-owner','developer','admin'].includes(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const servers = getWebServers();

    // Ping all projects + fetch GitHub info concurrently
    const results = await Promise.all(
      PROJECTS.map(async (proj) => {
        const [ping, github] = await Promise.all([
          pingProject(proj.url),
          getGithubInfo(proj.owner, proj.repo),
        ]);

        // Get lockdown/announce from DB if it's a known web server
        const dbServer = servers.find(s => s.id === proj.id);
        const lockdown  = dbServer?.lockdown  ?? { active: false };
        const announce  = dbServer?.announce  ?? { active: false };

        // Speed label
        let speed = 'Lambat';
        if (!ping.ok)     speed = 'Offline';
        else if (ping.ms < 300)  speed = 'Sangat Cepat';
        else if (ping.ms < 700)  speed = 'Cepat';
        else if (ping.ms < 1500) speed = 'Normal';

        return {
          ...proj,
          ping,
          speed,
          github,
          lockdown,
          announce,
          status: !ping.ok ? 'offline' : lockdown.active ? 'maintenance' : 'active',
          checkedAt: new Date().toISOString(),
        };
      })
    );

    return NextResponse.json({ success: true, projects: results });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
