/**
 * githubData.ts
 * Read/write JSON data files directly from GitHub API.
 * This is the ONLY reliable way to persist data across Vercel serverless invocations.
 */

const OWNER  = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'luminarydearx';
const REPO   = process.env.NEXT_PUBLIC_GITHUB_REPO  || 'SaturnDashboard---Personal-Dashboard';
const BRANCH = 'master';
const TOKEN  = process.env.GITHUB_TOKEN || '';

interface GHFile {
  content: string;  // base64
  sha:     string;
  encoding: string;
}

async function ghGet(path: string): Promise<GHFile | null> {
  if (!TOKEN) return null;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/${path}?ref=${BRANCH}`,
      { headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json' }, cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function ghPut(path: string, content: string, sha?: string): Promise<boolean> {
  if (!TOKEN) return false;
  try {
    const body: Record<string, string> = {
      message: `📊 saturn: update ${path}`,
      content: Buffer.from(content).toString('base64'),
      branch:  BRANCH,
    };
    if (sha) body.sha = sha;
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/data/${path}`,
      { method: 'PUT', headers: { Authorization: `token ${TOKEN}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
    );
    return res.ok;
  } catch { return false; }
}

export async function readFromGithub<T>(filename: string, defaultValue: T): Promise<T> {
  const file = await ghGet(filename);
  if (!file) return defaultValue;
  try {
    const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
    return JSON.parse(decoded) as T;
  } catch { return defaultValue; }
}

export async function writeToGithub<T>(filename: string, data: T): Promise<boolean> {
  // Get current SHA first (required for update)
  const existing = await ghGet(filename);
  const content   = JSON.stringify(data, null, 2);
  return ghPut(filename, content, existing?.sha);
}
