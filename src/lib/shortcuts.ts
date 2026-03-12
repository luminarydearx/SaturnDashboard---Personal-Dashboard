'use client';

// ── Default shortcuts ────────────────────────────────────────────────────────
export interface ShortcutMap {
  toggleSidebar: string;   // e.g. "/"
  focusSearch:   string;   // e.g. "f"
  logout:        string;   // e.g. "ctrl+l"
  openSettings:  string;   // e.g. "ctrl+,"
}

export const DEFAULT_SHORTCUTS: ShortcutMap = {
  toggleSidebar: '/',
  focusSearch:   'f',
  logout:        'ctrl+l',
  openSettings:  'ctrl+,',
};

export const SHORTCUT_LABELS: Record<keyof ShortcutMap, string> = {
  toggleSidebar: 'Toggle Sidebar',
  focusSearch:   'Focus Search',
  logout:        'Sign Out',
  openSettings:  'Open Settings',
};

const LS_KEY = 'saturn_shortcuts';

export function loadShortcuts(): ShortcutMap {
  if (typeof window === 'undefined') return { ...DEFAULT_SHORTCUTS };
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_SHORTCUTS };
    return { ...DEFAULT_SHORTCUTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SHORTCUTS };
  }
}

export function saveShortcuts(map: ShortcutMap): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LS_KEY, JSON.stringify(map)); } catch {}
}

/** Normalise a KeyboardEvent into a shortcut string like "ctrl+l" or "/" */
export function eventToShortcut(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey)               parts.push('alt');
  if (e.shiftKey)             parts.push('shift');
  const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
  if (!['control','meta','alt','shift'].includes(key)) parts.push(key);
  return parts.join('+');
}

/** Human-readable display string for a shortcut */
export function displayShortcut(s: string): string {
  return s
    .split('+')
    .map(p => {
      if (p === 'ctrl')  return '⌃';
      if (p === 'alt')   return '⌥';
      if (p === 'shift') return '⇧';
      if (p === 'space') return 'Space';
      if (p === ',')     return ',';
      return p.toUpperCase();
    })
    .join(' ');
}
