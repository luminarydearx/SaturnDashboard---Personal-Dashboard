'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light' | 'auto';

export interface AccentPreset {
  name: string;
  from: string;
  to: string;
  accent: string;   // primary CSS var
  accent2: string;  // secondary CSS var
}

export const ACCENT_PRESETS: AccentPreset[] = [
  { name: 'Cosmic',  from: '#7c3aed', to: '#06b6d4', accent: '#7c3aed', accent2: '#06b6d4' },
  { name: 'Sunset',  from: '#f97316', to: '#f43f5e', accent: '#f97316', accent2: '#f43f5e' },
  { name: 'Aurora',  from: '#10b981', to: '#3b82f6', accent: '#10b981', accent2: '#3b82f6' },
  { name: 'Gold',    from: '#f59e0b', to: '#f97316', accent: '#f59e0b', accent2: '#f97316' },
  { name: 'Nebula',  from: '#8b5cf6', to: '#ec4899', accent: '#8b5cf6', accent2: '#ec4899' },
  { name: 'Ocean',   from: '#0891b2', to: '#2dd4bf', accent: '#0891b2', accent2: '#2dd4bf' },
];

interface ThemeCtx {
  theme: Theme;
  setTheme: (t: Theme) => void;
  resolved: 'dark' | 'light';
  accentIndex: number;
  setAccentIndex: (i: number) => void;
  accent: AccentPreset;
}

const ThemeContext = createContext<ThemeCtx>({
  theme: 'dark',
  setTheme: () => {},
  resolved: 'dark',
  accentIndex: 0,
  setAccentIndex: () => {},
  accent: ACCENT_PRESETS[0],
});

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r},${g},${b}`;
}

function applyAccentVars(preset: AccentPreset, resolved: 'dark' | 'light') {
  const root = document.documentElement;
  root.style.setProperty('--c-accent',  preset.accent);
  root.style.setProperty('--c-accent2', preset.accent2);
  root.style.setProperty('--c-accent-rgb',  hexToRgb(preset.accent));
  root.style.setProperty('--c-accent2-rgb', hexToRgb(preset.accent2));
  // Gradient for buttons/text
  root.style.setProperty('--c-gradient', `linear-gradient(135deg, ${preset.from}, ${preset.to})`);
  root.style.setProperty('--c-gradient-r', `linear-gradient(to right, ${preset.from}, ${preset.to})`);
  // Card hover
  root.style.setProperty('--c-card-hover', `rgba(${hexToRgb(preset.accent)}, ${resolved === 'light' ? '0.04' : '0.06'})`);
  // Scrollbar
  root.style.setProperty('--c-scroll-thumb', `${preset.accent}60`);
  root.style.setProperty('--c-scroll-hover',  `${preset.accent2}80`);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme,       setThemeState]  = useState<Theme>('dark');
  const [resolved,    setResolved]    = useState<'dark' | 'light'>('dark');
  const [accentIndex, setAccentIdx]   = useState(0);

  // Hydrate from localStorage once
  useEffect(() => {
    const savedTheme  = (localStorage.getItem('saturn_theme')  as Theme) || 'dark';
    const savedAccent = parseInt(localStorage.getItem('saturn_accent') || '0', 10);
    setThemeState(savedTheme);
    setAccentIdx(isNaN(savedAccent) ? 0 : Math.min(savedAccent, ACCENT_PRESETS.length - 1));
  }, []);

  // Apply theme
  useEffect(() => {
    const applyTheme = (t: Theme) => {
      let actual: 'dark' | 'light';
      if (t === 'auto') {
        actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } else {
        actual = t;
      }
      setResolved(actual);
      document.documentElement.setAttribute('data-theme', actual);
      // Re-apply accent with new resolved theme
      const idx = parseInt(localStorage.getItem('saturn_accent') || '0', 10);
      const preset = ACCENT_PRESETS[isNaN(idx) ? 0 : idx] || ACCENT_PRESETS[0];
      applyAccentVars(preset, actual);
    };

    applyTheme(theme);

    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = () => applyTheme('auto');
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
  }, [theme]);

  // Apply accent
  useEffect(() => {
    const preset = ACCENT_PRESETS[accentIndex] || ACCENT_PRESETS[0];
    applyAccentVars(preset, resolved);
  }, [accentIndex, resolved]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem('saturn_theme', t);
  }, []);

  const setAccentIndex = useCallback((i: number) => {
    const safe = Math.min(i, ACCENT_PRESETS.length - 1);
    setAccentIdx(safe);
    localStorage.setItem('saturn_accent', String(safe));
  }, []);

  return (
    <ThemeContext.Provider value={{
      theme, setTheme, resolved,
      accentIndex, setAccentIndex,
      accent: ACCENT_PRESETS[accentIndex] || ACCENT_PRESETS[0],
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
