import fs from 'fs';
import path from 'path';
import type { User, Note, BackupEntry } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJson<T>(filename: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    return defaultValue;
  }
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch { return defaultValue; }
}

function writeJson<T>(filename: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
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

/** Auto-delete notes that have been done for > 24 hours */
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
export interface Settings {
  githubToken: string;
  githubRepo: string;
  githubOwner: string;
  lastPush: string;
}

export function getSettings(): Settings {
  return readJson<Settings>('settings.json', {
    githubToken: '', githubRepo: '', githubOwner: '', lastPush: '',
  });
}
export function saveSettings(settings: Settings): void {
  writeJson('settings.json', settings);
}

// ── Backups registry ──────────────────────────────────────────────────────
export function getBackups(): BackupEntry[] { return readJson<BackupEntry[]>('backups.json', []); }
export function saveBackups(entries: BackupEntry[]): void { writeJson('backups.json', entries); }
export function addBackupEntry(entry: BackupEntry): void {
  const list = getBackups();
  list.unshift(entry);
  saveBackups(list.slice(0, 100)); // keep last 100
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
    settings: { ...getSettings(), githubToken: '[HIDDEN]' },
  };
}

export function getRawDataFiles(): { path: string; content: string }[] {
  const s = getSettings();
  return [
    { path: 'data/users.json',    content: JSON.stringify(getUsers(),   null, 2) },
    { path: 'data/notes.json',    content: JSON.stringify(getNotes(),   null, 2) },
    { path: 'data/settings.json', content: JSON.stringify(s,            null, 2) },
    { path: 'data/backups.json',  content: JSON.stringify(getBackups(), null, 2) },
  ];
}

/** Extract just the repo name from a full GitHub URL or bare name */
export function extractRepoName(repoInput: string): string {
  if (!repoInput) return '';
  // Handle: https://github.com/owner/repo.git  or  https://github.com/owner/repo
  try {
    const url = new URL(repoInput);
    const parts = url.pathname.replace(/^\//, '').replace(/\.git$/, '').split('/');
    return parts[parts.length - 1] || repoInput;
  } catch {
    // Not a URL — might be "owner/repo" or just "repo"
    const parts = repoInput.replace(/\.git$/, '').split('/');
    return parts[parts.length - 1] || repoInput;
  }
}
