import fs from 'fs';
import path from 'path';
import type { User, Note, BackupEntry } from '@/types';

// Deteksi environment
const IS_VERCEL = process.env.VERCEL === '1';

// Tentukan folder data
// Di Vercel: gunakan /tmp (ephemeral)
// Di Lokal: gunakan folder 'data' di root project
const DATA_DIR = IS_VERCEL
  ? '/tmp/saturn-data'
  : path.join(process.cwd(), 'data');

// Pastikan folder ada
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

// Helper baca JSON dengan fallback aman
// Helper baca JSON dengan fallback aman
export function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);

  // 1. Coba baca dari lokasi aktif (/tmp di Vercel atau /data di lokal)
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      console.error(`Error parsing ${filename}:`, error);
      return defaultValue;
    }
  }

  // 2. Fallback: Coba copy dari bundled data/ (hanya untuk file non-sensitif)
  // Ini penting agar Vercel punya data awal users.json, notes.json, dll
  const bundledPath = path.join(process.cwd(), 'data', filename);
  if (fs.existsSync(bundledPath) && !filename.includes('settings')) {
    try {
      const content = fs.readFileSync(bundledPath, 'utf-8');
      // Copy ke lokasi aktif
      fs.writeFileSync(filePath, content);
      return JSON.parse(content) as T;
    } catch {}
  }

  // 3. Jika tetap tidak ada, buat baru dengan default value
  writeJson(filename, defaultValue);
  return defaultValue;
}

// Helper tulis JSON
export function writeJson<T>(filename: string, data: T): void {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// ── Users ────────────────────────────────────────────────────────────────
export function getUsers(): User[] { return readJson<User[]>('users.json', []); }
export function saveUsers(users: User[]): void { writeJson('users.json', users); }
export function addUser(newUser: User): User {
  const users = getUsers(); users.push(newUser); saveUsers(users); return newUser;
}
export function getUserById(id: string): User | undefined {
  return getUsers().find(u => u.id === id);
}
export function getUserByUsername(username: string): User | undefined {
  return getUsers().find(u => u.username.toLowerCase() === username.toLowerCase());
}
export function getUserByEmail(email: string): User | undefined {
  return getUsers().find(u => (u.email||'').toLowerCase() === email.toLowerCase());
}
export function updateUser(id: string, updates: Partial<User>): User | null {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  saveUsers(users);
  return users[idx];
}

// ── Notes ────────────────────────────────────────────────────────────────
export function getNotes(): Note[] { return readJson<Note[]>('notes.json', []); }
export function saveNotes(notes: Note[]): void { writeJson('notes.json', notes); }
export function getNoteById(id: string): Note | undefined {
  return getNotes().find(n => n.id === id);
}
export function createNote(note: Note): Note {
  const notes = getNotes(); notes.unshift(note); saveNotes(notes); return note;
}
export function updateNote(id: string, updates: Partial<Note>): Note | null {
  const notes = getNotes();
  const idx = notes.findIndex(n => n.id === id);
  if (idx === -1) return null;
  notes[idx] = { ...notes[idx], ...updates, updatedAt: new Date().toISOString() };
  saveNotes(notes);
  return notes[idx];
}
export function deleteNote(id: string): boolean {
  const notes = getNotes();
  const filtered = notes.filter(n => n.id !== id);
  if (filtered.length === notes.length) return false;
  saveNotes(filtered);
  return true;
}

export function purgeDoneNotes(): number {
  const notes = getNotes();
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const keep = notes.filter(n => {
    if (!n.done || !n.doneAt) return true;
    return new Date(n.doneAt).getTime() > cutoff;
  });
  if (keep.length !== notes.length) {
    saveNotes(keep);
    return notes.length - keep.length;
  }
  return 0;
}

// ── Settings ─────────────────────────────────────────────────────────────
export interface AutogenSchedule {
  lockdownEnabled:   boolean;
  lockdownAt:        string;
  lockdownReason:    string;
  lockdownMediaUrl:  string;
  unlockEnabled:     boolean;
  unlockAt:          string;
}
export interface AutogenLockdown {
  active:    boolean;
  reason:    string;
  timestamp: string;
  mediaUrl?: string;
  routes?:   string[];
}

export interface AttendanceRecord {
  id:          string;
  userId:      string;
  username:    string;
  displayName: string;
  role:        string;
  avatar?:     string;
  scannedAt:   string;   // ISO
  ip?:         string;
}

export interface AutogenAnnounce {
  active:    boolean;
  message:   string;
  type:      'info' | 'warning' | 'success' | 'error';
  link?:     string;
  linkText?: string;
  updatedAt: string;
}

export interface WebServerLockdown {
  active:    boolean;
  reason:    string;
  timestamp: string;
  mediaUrl?: string;
  routes?:   string[];   // undefined = full lockdown; array = route-specific
}

export interface WebServerAnnounce {
  active:    boolean;
  message:   string;
  type:      'info' | 'warning' | 'success' | 'error';
  link?:     string;
  linkText?: string;
  id?:       string;   // unique ID for localStorage dismiss tracking
  updatedAt?: string;
}

export interface WebServerSchedule {
  lockdownEnabled: boolean;
  lockdownAt:      string;
  lockdownReason:  string;
  lockdownMediaUrl: string;
  unlockEnabled:   boolean;
  unlockAt:        string;
}

export interface WebServerConfig {
  id:          string;   // 'memoire' | 'codelabx'
  name:        string;
  url:         string;
  githubOwner: string;
  githubRepo:  string;
  vercelProjectId: string;
  lockdown:    WebServerLockdown;
  announce:    WebServerAnnounce;
  schedule:    WebServerSchedule;
}

export interface Settings {
  // githubToken is intentionally absent — use process.env.GITHUB_TOKEN only
  githubRepo:        string;
  githubOwner:       string;
  lastPush:          string;
  autogenSchedule?:  AutogenSchedule;
  autogenAnnounce?:  AutogenAnnounce;
  autogenLockdown?:  AutogenLockdown;
  webServers?:       WebServerConfig[];
}

const DEFAULT_SCHEDULE: AutogenSchedule = {
  lockdownEnabled: false, lockdownAt: '',
  lockdownReason: '',     lockdownMediaUrl: '',
  unlockEnabled: false,   unlockAt: '',
};

export function getAttendance(): AttendanceRecord[] {
  return readJson<AttendanceRecord[]>('attendance.json', []);
}

export function addAttendance(rec: AttendanceRecord): void {
  const all = getAttendance();
  all.unshift(rec);
  writeJson('attendance.json', all.slice(0, 2000));
}

export function updateUserQR(userId: string, qrCodeUrl: string, qrToken: string): void {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx >= 0) {
    (users[idx] as any).qrCodeUrl = qrCodeUrl;
    (users[idx] as any).qrToken   = qrToken;
    saveUsers(users);
  }
}

export function getUserByQRToken(token: string): User | undefined {
  return getUsers().find(u => (u as any).qrToken === token);
}

export function getSettings(): Settings {
  return readJson<Settings>('settings.json', {
    githubRepo: '', githubOwner: '', lastPush: '',
  });
}

/** Always read GitHub token from env var — NEVER from file */
export function getGithubToken(): string {
  return process.env.GITHUB_TOKEN || '';
}

export function saveSettings(settings: Settings): void {
  // Defensive: ensure githubToken never lands in the JSON file
  const safe: Record<string, unknown> = { ...settings as any };
  delete safe.githubToken;
  writeJson('settings.json', safe);
}

export function getAutogenSchedule(): AutogenSchedule {
  return getSettings().autogenSchedule ?? { ...DEFAULT_SCHEDULE };
}

export function getAutogenLockdown(): AutogenLockdown {
  return getSettings().autogenLockdown ?? { active: false, reason: '', timestamp: '' };
}

export function saveAutogenLockdown(lock: AutogenLockdown): void {
  saveSettings({ ...getSettings(), autogenLockdown: lock });
}

export function getAutogenAnnounce(): AutogenAnnounce {
  return getSettings().autogenAnnounce ?? { active: false, message: '', type: 'info', link: '', linkText: '', updatedAt: '' };
}

export function saveAutogenAnnounce(ann: AutogenAnnounce): void {
  saveSettings({ ...getSettings(), autogenAnnounce: ann });
}

export function saveAutogenSchedule(schedule: AutogenSchedule): void {
  saveSettings({ ...getSettings(), autogenSchedule: schedule });
}

// ── Backups registry ──────────────────────────────────────────────────────
export const DEFAULT_WEB_SERVERS: WebServerConfig[] = [
  {
    id: 'memoire', name: 'Memoire', url: 'https://memoirepersonal.vercel.app',
    githubOwner: 'luminarydearx', githubRepo: 'Memoire',
    vercelProjectId: 'prj_LpWX4OLwSAixhd6qhzcTAZCtUUOL',
    lockdown: { active: false, reason: '', timestamp: '' },
    announce: { active: false, message: '', type: 'info' },
    schedule: { lockdownEnabled: false, lockdownAt: '', lockdownReason: '', lockdownMediaUrl: '', unlockEnabled: false, unlockAt: '' },
  },
  {
    id: 'codelabx', name: 'CodeLabX', url: 'https://code-lab-x.vercel.app',
    githubOwner: 'luminarydearx', githubRepo: 'CodeLabX',
    vercelProjectId: 'prj_VZ9ArdVjkMtXqZtGrJuohD1XMBIR',
    lockdown: { active: false, reason: '', timestamp: '' },
    announce: { active: false, message: '', type: 'info' },
    schedule: { lockdownEnabled: false, lockdownAt: '', lockdownReason: '', lockdownMediaUrl: '', unlockEnabled: false, unlockAt: '' },
  },
];

export function getWebServers(): WebServerConfig[] {
  const s = getSettings();
  return s.webServers ?? DEFAULT_WEB_SERVERS;
}

export function saveWebServers(servers: WebServerConfig[]): void {
  const s = getSettings();
  saveSettings({ ...s, webServers: servers });
}

export function getWebServerById(id: string): WebServerConfig | undefined {
  return getWebServers().find(s => s.id === id);
}

export function updateWebServer(id: string, updates: Partial<WebServerConfig>): WebServerConfig | null {
  const servers = getWebServers();
  const idx = servers.findIndex(s => s.id === id);
  if (idx < 0) return null;
  servers[idx] = { ...servers[idx], ...updates };
  saveWebServers(servers);
  return servers[idx];
}

export function getBackups(): BackupEntry[] { return readJson<BackupEntry[]>('backups.json', []); }
export function saveBackups(entries: BackupEntry[]): void { writeJson('backups.json', entries); }
export function addBackupEntry(entry: BackupEntry): void {
  const list = getBackups();
  list.unshift(entry);
  saveBackups(list.slice(0, 100));
}
export function deleteBackupEntry(id: string): boolean {
  const list = getBackups();
  const filtered = list.filter(b => b.id !== id);
  if (filtered.length === list.length) return false;
  saveBackups(filtered);
  return true;
}
export function renameBackupEntry(id: string, name: string): boolean {
  const list = getBackups();
  const idx = list.findIndex(b => b.id === id);
  if (idx === -1) return false;
  list[idx] = { ...list[idx], name };
  saveBackups(list);
  return true;
}

// ── Helpers ───────────────────────────────────────────────────────────────
export function getAllDataAsJson(): Record<string, unknown> {
  return {
    users: getUsers().map(u => ({ ...u, password: '[HIDDEN]' })),
    notes: getNotes(),
    settings: getSettings(),
  };
}

export function getRawDataFiles(): { path: string; content: string }[] {
  const s = getSettings();
  return [
    { path: 'data/users.json',          content: JSON.stringify(getUsers(),   null, 2) },
    { path: 'data/notes.json',          content: JSON.stringify(getNotes(),   null, 2) },
    { path: 'data/settings.json',       content: JSON.stringify(s,            null, 2) },
    { path: 'data/backups.json',        content: JSON.stringify(getBackups(), null, 2) },
    { path: 'data/activity-logs.json',  content: JSON.stringify(readJson('activity-logs.json',  []), null, 2) },
    { path: 'data/attendance.json',     content: JSON.stringify(readJson('attendance.json',     []), null, 2) },
    { path: 'data/tasks.json',          content: JSON.stringify(readJson('tasks.json',          []), null, 2) },
  ];
}

export function extractRepoName(repoInput: string): string {
  if (!repoInput) return '';
  try {
    const url = new URL(repoInput);
    const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    return parts[parts.length - 1] || repoInput;
  } catch {
    const parts = repoInput.replace(/\.git$/, '').split('/');
    return parts[parts.length - 1] || repoInput;
  }
}