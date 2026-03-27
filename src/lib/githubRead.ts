/**
 * githubRead.ts
 * Read data files DIRECTLY from GitHub API to bypass Vercel ephemeral filesystem.
 * This ensures activity logs, attendance etc. are ALWAYS realtime regardless
 * of which serverless container handles the request.
 */

const OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'luminarydearx';
const REPO  = process.env.NEXT_PUBLIC_GITHUB_REPO  || 'SaturnDashboard---Personal-Dashboard';
const TOKEN = () => process.env.GITHUB_TOKEN || '';

export async function readFileFromGithub<T>(
  githubPath: string,  // e.g. "data/activity-logs.json"
  fallback: T
): Promise<T> {
  const token = TOKEN();
  if (!token) return fallback;
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${githubPath}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `token ${token}`,
        Accept: 'application/vnd.github.v3+json',
      },
      cache: 'no-store',
      // @ts-ignore - Next.js fetch extension
      next: { revalidate: 0 },
    });
    if (!res.ok) return fallback;
    const data = await res.json();
    if (!data.content) return fallback;
    const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(decoded) as T;
  } catch {
    return fallback;
  }
}
