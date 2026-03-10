/**
 * autoBackup.ts — Client-side backup scheduler for Saturn Dashboard
 *
 * Runs entirely in the browser. Persists timing in localStorage.
 * Never blocks the UI — all operations are fire-and-forget async.
 */

const LS_KEY_LAST_LOCAL  = 'saturn_backup_last_local';
const LS_KEY_LAST_GITHUB = 'saturn_backup_last_github';
const LS_KEY_STATUS      = 'saturn_backup_status';
const INTERVAL_MS        = 24 * 60 * 60 * 1000; // 24 hours

export interface BackupStatusData {
  lastLocal:  string | null;   // ISO timestamp
  lastGithub: string | null;   // ISO timestamp
  nextDue:    string | null;   // ISO timestamp
  status:     'idle' | 'running' | 'done' | 'error';
  message:    string;
}

export function getBackupStatus(): BackupStatusData {
  if (typeof window === 'undefined') return { lastLocal: null, lastGithub: null, nextDue: null, status: 'idle', message: '' };
  const lastLocal  = localStorage.getItem(LS_KEY_LAST_LOCAL);
  const lastGithub = localStorage.getItem(LS_KEY_LAST_GITHUB);
  const status     = (localStorage.getItem(LS_KEY_STATUS) || 'idle') as BackupStatusData['status'];

  // Next due = earliest of the two, or now if never ran
  const lastTime = lastLocal ? new Date(lastLocal).getTime() : 0;
  const nextDue  = new Date(lastTime + INTERVAL_MS).toISOString();

  return { lastLocal, lastGithub, nextDue, status, message: '' };
}

export function isBackupDue(): boolean {
  if (typeof window === 'undefined') return false;
  const last = localStorage.getItem(LS_KEY_LAST_LOCAL);
  if (!last) return true;
  return Date.now() - new Date(last).getTime() > INTERVAL_MS;
}

/** Trigger a local ZIP download (creates invisible <a> and clicks it) */
export async function downloadLocalBackup(): Promise<void> {
  const a = document.createElement('a');
  a.href     = '/api/backup';
  a.download = '';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  localStorage.setItem(LS_KEY_LAST_LOCAL, new Date().toISOString());
  localStorage.setItem(LS_KEY_STATUS, 'done');
}

/** Push backup ZIP to GitHub repo */
export async function pushGithubBackup(): Promise<{ success: boolean; error?: string }> {
  localStorage.setItem(LS_KEY_STATUS, 'running');
  try {
    const res  = await fetch('/api/backup', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    const data = await res.json();
    if (data.success) {
      localStorage.setItem(LS_KEY_LAST_GITHUB, new Date().toISOString());
      localStorage.setItem(LS_KEY_STATUS, 'done');
      return { success: true };
    } else {
      localStorage.setItem(LS_KEY_STATUS, 'error');
      return { success: false, error: data.error };
    }
  } catch (e: any) {
    localStorage.setItem(LS_KEY_STATUS, 'error');
    return { success: false, error: e.message };
  }
}

/** Run both local + GitHub backup */
export async function runFullBackup(
  onProgress: (step: 'local' | 'github', done: boolean, error?: string) => void
): Promise<void> {
  // Local download first
  try {
    await downloadLocalBackup();
    onProgress('local', true);
  } catch (e: any) {
    onProgress('local', false, e.message);
  }

  // Then GitHub
  const ghResult = await pushGithubBackup();
  onProgress('github', ghResult.success, ghResult.error);
}

/**
 * Call this once on DashboardShell mount (owner only).
 * Returns a cleanup function.
 */
export function startBackupScheduler(
  onBackupDue: () => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  // Check immediately on mount
  if (isBackupDue()) {
    // Small delay to not block initial render
    const t = setTimeout(onBackupDue, 3000);
    const interval = setInterval(() => {
      if (isBackupDue()) onBackupDue();
    }, 60 * 60 * 1000); // re-check every hour

    return () => { clearTimeout(t); clearInterval(interval); };
  }

  // Check every hour
  const interval = setInterval(() => {
    if (isBackupDue()) onBackupDue();
  }, 60 * 60 * 1000);

  return () => clearInterval(interval);
}
