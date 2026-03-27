/**
 * githubStorage.ts
 * Read-through cache: local filesystem first, GitHub as fallback.
 * Solves Vercel cold-start empty filesystem problem.
 */

const OWNER = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'luminarydearx';
const REPO  = process.env.NEXT_PUBLIC_GITHUB_REPO  || 'SaturnDashboard---Personal-Dashboard';

/** Fetch a JSON file from GitHub repo (raw API). Returns null if not found. */
export async function fetchJsonFromGithub<T>(filename: string, defaultVal: T): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token || !OWNER || !REPO) return defaultVal;
  try {
    const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/${filename}`;
    const res = await fetch(url, {
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' },
      next: { revalidate: 0 }, // always fresh
    } as RequestInit);
    if (!res.ok) return defaultVal;
    const data = await res.json() as { content: string };
    const decoded = Buffer.from(data.content, 'base64').toString('utf-8');
    return JSON.parse(decoded) as T;
  } catch {
    return defaultVal;
  }
}
