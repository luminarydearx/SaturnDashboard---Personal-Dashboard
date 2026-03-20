/**
 * dataPersist.ts
 * Fire-and-forget: push data JSON files to GitHub so they survive Vercel re-deployments.
 * Vercel's filesystem resets on each deployment — this preserves key data.
 */
import { pushToGithub } from './github';
import { readJson } from './db';

const OWNER  = process.env.NEXT_PUBLIC_GITHUB_OWNER || 'luminarydearx';
const REPO   = process.env.NEXT_PUBLIC_GITHUB_REPO  || 'SaturnDashboard---Personal-Dashboard';
const BRANCH = 'data';   // dedicated branch, won't pollute master

const FILES_TO_PERSIST = [
  'activity-logs.json',
  'clipboard.json',
  'reminders.json',
  'attendance.json',
  'autogen-drafts.json',
];

export async function persistDataFile(filename: string): Promise<void> {
  const token = process.env.GITHUB_TOKEN || '';
  if (!token) return;   // silently skip if no token

  try {
    const data = readJson<unknown>(filename, null);
    if (data === null) return;

    await pushToGithub({
      token, owner: OWNER, repo: REPO,
      files: [{ path: `data/${filename}`, content: JSON.stringify(data, null, 2) }],
      message: `📊 auto-persist: ${filename}`,
      branch: BRANCH,
    });
  } catch {
    // Silent fail — persistence is best-effort, never breaks main flow
  }
}

export async function persistAll(): Promise<void> {
  await Promise.allSettled(FILES_TO_PERSIST.map(persistDataFile));
}
