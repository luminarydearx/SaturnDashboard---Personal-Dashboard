import { getSettings, getRawDataFiles, saveSettings, extractRepoName } from './db';
import { pushToGithub } from './github';

export async function autoSyncToGithub(message?: string): Promise<void> {
  const settings = getSettings();
  if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) return;

  const repoName = extractRepoName(settings.githubRepo);
  const files = getRawDataFiles();
  try {
    const result = await pushToGithub({
      token: settings.githubToken,
      owner: settings.githubOwner,
      repo:  repoName,
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
