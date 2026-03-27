import { readJson, writeJson } from './db';
import { readFromGithub, writeToGithub } from './githubData';

export type ActivityCategory =
  | 'auth' | 'user' | 'lockdown' | 'announce' | 'note' | 'backup' | 'settings' | 'system';

export interface ActivityLog {
  id:         string;
  timestamp:  string;
  category:   ActivityCategory;
  action:     string;
  actor:      string;
  actorRole?: string;
  target?:    string;
  detail?:    string;
  success:    boolean;
  ip?:        string;
}

const FILE    = 'activity-logs.json';
const MAX     = 1000;

// Write to local + GitHub asynchronously
export function logActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>): void {
  try {
    const newEntry: ActivityLog = {
      id:        Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      ...entry,
    };

    // Write local first (fast, sync)
    const localLogs = readJson<ActivityLog[]>(FILE, []);
    localLogs.unshift(newEntry);
    const trimmed = localLogs.slice(0, MAX);
    writeJson(FILE, trimmed);

    // Write to GitHub (async, fire-and-forget)
    readFromGithub<ActivityLog[]>(FILE, []).then(ghLogs => {
      ghLogs.unshift(newEntry);
      return writeToGithub(FILE, ghLogs.slice(0, MAX));
    }).catch(() => {});
  } catch {
    // Silent — logging must never break main flow
  }
}

export function getActivityLogs(opts?: {
  limit?: number; category?: ActivityCategory; actor?: string;
}): ActivityLog[] {
  try {
    let logs = readJson<ActivityLog[]>(FILE, []);
    if (opts?.category) logs = logs.filter(l => l.category === opts.category);
    if (opts?.actor)    logs = logs.filter(l => l.actor === opts.actor);
    return logs.slice(0, opts?.limit ?? 200);
  } catch { return []; }
}

export function clearActivityLogs(): void {
  writeJson(FILE, []);
  writeToGithub(FILE, []).catch(() => {});
}
