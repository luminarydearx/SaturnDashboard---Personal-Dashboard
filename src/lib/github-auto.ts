import { getSettings, getGithubToken, getRawDataFiles, saveSettings, extractRepoName } from './db';
import { pushToGithub } from './github';

export async function autoSyncToGithub(message?: string): Promise<void> {
  // Token ALWAYS from environment variable — never from settings file
  const token = getGithubToken();
  if (!token) {
    console.warn('[auto-sync] GITHUB_TOKEN env var not set, skipping sync');
    return;
  }

  const settings = getSettings();
  const owner = settings.githubOwner || process.env.NEXT_PUBLIC_GITHUB_OWNER || '';
  const repo  = settings.githubRepo  || process.env.NEXT_PUBLIC_GITHUB_REPO  || '';

  if (!owner || !repo) {
    console.warn('[auto-sync] githubOwner/githubRepo not configured, skipping sync');
    return;
  }

  const repoName = extractRepoName(repo);
  const files    = getRawDataFiles();
  try {
    const result = await pushToGithub({
      token,
      owner,
      repo: repoName,
      files,
      message: message || 'SaturnDashboard: auto-sync',
    });
    if (result.success) {
      saveSettings({ ...settings, lastPush: new Date().toISOString() });
    }
  } catch (e) {
    console.error('[auto-sync] GitHub push failed silently:', e);
  }
}
