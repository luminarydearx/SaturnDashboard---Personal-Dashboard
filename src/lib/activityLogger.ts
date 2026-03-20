import { autoSyncToGithub } from './github-auto';
import { readJson, writeJson } from './db';

export type ActivityCategory =
  | 'auth'        // login, logout, failed login
  | 'user'        // create, update, delete, ban, promote
  | 'lockdown'    // lock, unlock (per server)
  | 'announce'    // set, clear (per server)
  | 'note'        // create, edit, delete note
  | 'backup'      // backup, restore
  | 'settings'    // settings changed
  | 'system';     // server restart, deploy

export interface ActivityLog {
  id:         string;
  timestamp:  string;      // ISO
  category:   ActivityCategory;
  action:     string;      // e.g. "LOCKDOWN_LOCK", "AUTH_LOGIN_FAIL"
  actor:      string;      // username or "system" or "anonymous"
  actorRole?: string;
  target?:    string;      // e.g. server name, username targeted
  detail?:    string;      // extra context
  success:    boolean;
  ip?:        string;
}

const FILE = 'activity-logs.json';
const MAX  = 1000;           // keep last 1000 entries

export function logActivity(entry: Omit<ActivityLog, 'id' | 'timestamp'>): void {
  try {
    const logs = readJson<ActivityLog[]>(FILE, []);
    const newEntry: ActivityLog = {
      id:        Math.random().toString(36).slice(2, 10),
      timestamp: new Date().toISOString(),
      ...entry,
    };
    logs.unshift(newEntry);
    writeJson(FILE, logs.slice(0, MAX));
    // Fire-and-forget persist to GitHub
    autoSyncToGithub('auto-sync: activity-logs').catch(() => {});
  } catch {
    // Silent — logging should never break the main flow
  }
}

export function getActivityLogs(opts?: {
  limit?: number;
  category?: ActivityCategory;
  actor?: string;
}): ActivityLog[] {
  try {
    let logs = readJson<ActivityLog[]>(FILE, []);
    if (opts?.category) logs = logs.filter(l => l.category === opts.category);
    if (opts?.actor)    logs = logs.filter(l => l.actor === opts.actor);
    return logs.slice(0, opts?.limit ?? 200);
  } catch {
    return [];
  }
}

export function clearActivityLogs(): void {
  writeJson(FILE, []);
}
