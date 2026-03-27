'use client';

export interface ShortcutMap {
  toggleSidebar: string;
  focusSearch:   string;
  logout:        string;
  openSettings:  string;
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

function lsKey(userId?: string) {
  return userId ? `saturn_shortcuts_${userId}` : 'saturn_shortcuts';
}

export function loadShortcuts(userId?: string): ShortcutMap {
  if (typeof window === 'undefined') return { ...DEFAULT_SHORTCUTS };
  try {
    // Try user-specific key first, fall back to legacy global key
    const raw = localStorage.getItem(lsKey(userId))
             || (userId ? null : localStorage.getItem('saturn_shortcuts'));
    if (!raw) return { ...DEFAULT_SHORTCUTS };
    return { ...DEFAULT_SHORTCUTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SHORTCUTS };
  }
}

export function saveShortcuts(map: ShortcutMap, userId?: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(lsKey(userId), JSON.stringify(map));
    // Fire update event so Navbar picks up change immediately
    window.dispatchEvent(new Event('saturn-shortcuts-updated'));
  } catch {}
}

const MODIFIERS = ['control', 'meta', 'alt', 'shift'];

export function eventToShortcut(e: KeyboardEvent): string {
  const key = e.key === ' ' ? 'space' : e.key.toLowerCase();
  if (MODIFIERS.includes(key)) return '';
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('ctrl');
  if (e.altKey)               parts.push('alt');
  if (e.shiftKey)             parts.push('shift');
  parts.push(key);
  return parts.join('+');
}

export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  if (!shortcut) return false;
  const got = eventToShortcut(e);
  return got !== '' && got === shortcut;
}

export function displayShortcut(s: string): string {
  return s.split('+').map(p => {
    if (p === 'ctrl')  return '⌃';
    if (p === 'alt')   return '⌥';
    if (p === 'shift') return '⇧';
    if (p === 'space') return 'Space';
    return p.toUpperCase();
  }).join(' ');
}

export function inlineShortcut(s: string): string {
  return s.split('+').map(p => {
    if (p === 'ctrl')  return 'Ctrl';
    if (p === 'alt')   return 'Alt';
    if (p === 'shift') return 'Shift';
    if (p === 'space') return 'Space';
    return p.toUpperCase();
  }).join('+');
}
