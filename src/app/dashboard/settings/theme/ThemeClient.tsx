'use client';

import { useState } from 'react';
import { PublicUser } from '@/types';
import { useTheme } from '@/components/ui/ThemeContext';
import { MdPalette, MdDarkMode, MdLightMode, MdSettingsBrightness, MdCheck } from 'react-icons/md';
import { motion } from 'framer-motion';

interface Props { user: PublicUser; }

type Theme = 'dark' | 'light' | 'auto';

const THEMES: { id: Theme; label: string; desc: string; icon: React.ElementType; preview: string }[] = [
  { id: 'dark',  label: 'Dark',  desc: 'Deep space aesthetic', icon: MdDarkMode,           preview: 'dark' },
  { id: 'light', label: 'Light', desc: 'Clean & bright',       icon: MdLightMode,          preview: 'light' },
  { id: 'auto',  label: 'Auto',  desc: 'Follows system',       icon: MdSettingsBrightness, preview: 'auto' },
];

const ACCENT_PRESETS = [
  { name: 'Cosmic',  from: '#7c3aed', to: '#06b6d4' },
  { name: 'Sunset',  from: '#f97316', to: '#f43f5e' },
  { name: 'Aurora',  from: '#10b981', to: '#3b82f6' },
  { name: 'Gold',    from: '#f59e0b', to: '#f97316' },
  { name: 'Nebula',  from: '#8b5cf6', to: '#ec4899' },
  { name: 'Ocean',   from: '#0891b2', to: '#2dd4bf' },
];

function ThemePreviewCard({ mode }: { mode: 'dark' | 'light' | 'auto' }) {
  const isDark = mode === 'dark' || mode === 'auto';
  const bg     = isDark ? '#04040d' : '#f4f4ff';
  const surf   = isDark ? '#0a0a1a' : '#ffffff';
  const text   = isDark ? '#e2e8f0' : '#1a1a2e';
  const muted  = isDark ? '#64748b' : '#6b6b9a';
  const border = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(100,80,200,0.15)';

  return (
    <div className="w-full rounded-xl overflow-hidden text-[8px]" style={{ background: bg, border: `1px solid ${border}` }}>
      {/* Mini navbar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b" style={{ borderColor: border, background: isDark ? '#070712' : '#f0f0fa' }}>
        <div className="w-3 h-3 rounded-full" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)' }} />
        <div className="h-1.5 w-10 rounded" style={{ background: isDark ? '#1a1a2e' : '#e0e0f0' }} />
        <div className="ml-auto flex gap-1">
          <div className="w-4 h-1.5 rounded" style={{ background: isDark ? '#1a1a2e' : '#e0e0f0' }} />
          <div className="w-3 h-3 rounded-full bg-violet-500/40" />
        </div>
      </div>
      {/* Mini content */}
      <div className="flex gap-1.5 p-2">
        <div className="w-10 rounded-lg" style={{ background: isDark ? '#050510' : '#f8f8ff', border: `1px solid ${border}` }}>
          {[1,2,3].map(i => (
            <div key={i} className="mx-1 my-1.5 h-1.5 rounded" style={{ background: isDark ? '#1a1a2e' : '#e0e0f0', width: `${70-i*10}%` }} />
          ))}
        </div>
        <div className="flex-1 space-y-1.5">
          <div className="h-8 rounded-lg" style={{ background: surf, border: `1px solid ${border}` }} />
          <div className="grid grid-cols-2 gap-1">
            <div className="h-5 rounded-lg" style={{ background: surf, border: `1px solid ${border}` }} />
            <div className="h-5 rounded-lg" style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', opacity: 0.7 }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemeClient({ user: _user }: Props) {
  const { theme, setTheme, resolved } = useTheme();
  const [accent, setAccent] = useState(0);

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/30 to-pink-600/30 border border-violet-500/20 flex items-center justify-center">
          <MdPalette size={24} className="text-violet-400" />
        </div>
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Theme</h1>
          <p className="text-[var(--c-muted)] text-sm">Customize the appearance of your dashboard</p>
        </div>
      </div>

      {/* Color Mode */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)] mb-1">Color Mode</h2>
        <p className="text-[var(--c-muted)] text-xs mb-5">Choose how the dashboard looks</p>

        <div className="grid grid-cols-3 gap-4">
          {THEMES.map(({ id, label, desc, icon: Icon }) => {
            const isActive = theme === id;
            return (
              <motion.button
                key={id}
                onClick={() => setTheme(id)}
                whileTap={{ scale: 0.97 }}
                className="relative flex flex-col gap-3 p-4 rounded-2xl text-left transition-all"
                style={{
                  background: isActive ? 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(6,182,212,0.1))' : 'var(--c-surface2)',
                  border: isActive ? '2px solid rgba(124,58,237,0.4)' : '2px solid var(--c-border)',
                }}
              >
                {/* Preview */}
                <ThemePreviewCard mode={id === 'auto' ? (resolved === 'light' ? 'light' : 'dark') : id} />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className={isActive ? 'text-violet-400' : 'text-[var(--c-muted)]'} />
                    <div>
                      <p className={`text-sm font-bold ${isActive ? 'text-[var(--c-text)]' : 'text-[var(--c-muted)]'}`}>{label}</p>
                      <p className="text-[10px] text-[var(--c-muted)] opacity-70">{desc}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center flex-shrink-0">
                      <MdCheck size={12} className="text-white" />
                    </div>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Accent Color */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)] mb-1">Accent Color</h2>
        <p className="text-[var(--c-muted)] text-xs mb-5">Choose a color theme for buttons and highlights</p>

        <div className="grid grid-cols-3 gap-3">
          {ACCENT_PRESETS.map((preset, i) => {
            const isActive = accent === i;
            return (
              <button
                key={preset.name}
                onClick={() => setAccent(i)}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: isActive ? `linear-gradient(135deg, ${preset.from}22, ${preset.to}11)` : 'var(--c-surface2)',
                  border: isActive ? `2px solid ${preset.from}66` : '2px solid var(--c-border)',
                }}
              >
                <div className="w-8 h-8 rounded-xl flex-shrink-0"
                  style={{ background: `linear-gradient(135deg, ${preset.from}, ${preset.to})` }} />
                <div className="text-left">
                  <p className={`text-sm font-semibold ${isActive ? 'text-[var(--c-text)]' : 'text-[var(--c-muted)]'}`}>{preset.name}</p>
                  <p className="text-[10px] font-mono" style={{ color: preset.from }}>{preset.from}</p>
                </div>
                {isActive && <MdCheck size={16} className="ml-auto flex-shrink-0" style={{ color: preset.from }} />}
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-[var(--c-muted)] opacity-50 mt-4 text-center">
          Accent color customization — coming soon (full CSS variable injection)
        </p>
      </div>

      {/* Current theme info */}
      <div className="rounded-2xl p-4 flex items-center gap-4"
        style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <MdSettingsBrightness size={20} className="text-violet-400" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--c-text)]">Current: <span className="text-violet-400 capitalize">{theme}</span></p>
          <p className="text-xs text-[var(--c-muted)]">Rendered as: <span className="text-cyan-400 capitalize">{resolved}</span> mode</p>
        </div>
      </div>
    </div>
  );
}
