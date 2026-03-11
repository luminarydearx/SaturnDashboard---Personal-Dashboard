'use client';

import { PublicUser } from '@/types';
import { useTheme, ACCENT_PRESETS } from '@/components/ui/ThemeContext';
import { MdPalette, MdDarkMode, MdLightMode, MdSettingsBrightness, MdCheck } from 'react-icons/md';
import { motion } from 'framer-motion';

interface Props { user: PublicUser; }
type Theme = 'dark' | 'light' | 'auto';

const THEMES: { id: Theme; label: string; desc: string; icon: React.ElementType }[] = [
  { id: 'dark',  label: 'Dark',  desc: 'Deep space aesthetic', icon: MdDarkMode },
  { id: 'light', label: 'Light', desc: 'Clean & bright',       icon: MdLightMode },
  { id: 'auto',  label: 'Auto',  desc: 'Follows system',       icon: MdSettingsBrightness },
];

function MiniPreview({ mode, accent }: { mode: 'dark' | 'light'; accent: typeof ACCENT_PRESETS[0] }) {
  const dark   = mode === 'dark';
  const bg     = dark ? '#04040d' : '#f0f0fc';
  const surf   = dark ? '#0a0a1a' : '#ffffff';
  const border = dark ? 'rgba(255,255,255,0.08)' : 'rgba(120,100,220,0.15)';
  const muted  = dark ? '#1a1a2e' : '#e0e0f0';
  const textC  = dark ? '#e2e8f0' : '#1e1b4b';
  const grad   = `linear-gradient(135deg, ${accent.from}, ${accent.to})`;
  const sidebarBg = dark ? '#050510' : '#fafafe';

  return (
    <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', fontSize: 8 }}>
      {/* Navbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', borderBottom: `1px solid ${border}`, background: dark ? '#070712' : '#f5f5ff' }}>
        <div style={{ width: 12, height: 12, borderRadius: '50%', background: grad }} />
        <div style={{ height: 5, width: 40, borderRadius: 3, background: muted }} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
          <div style={{ width: 16, height: 5, borderRadius: 3, background: muted }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: `${accent.accent}33` }} />
        </div>
      </div>
      {/* Body */}
      <div style={{ display: 'flex', gap: 6, padding: 8 }}>
        {/* Sidebar */}
        <div style={{ width: 36, borderRadius: 6, background: sidebarBg, border: `1px solid ${border}`, padding: 4, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {[80, 65, 70].map((w, i) => (
            <div key={i} style={{ height: 5, borderRadius: 3, background: i === 0 ? grad : muted, width: `${w}%` }} />
          ))}
        </div>
        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ height: 28, borderRadius: 6, background: surf, border: `1px solid ${border}` }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
            <div style={{ height: 18, borderRadius: 6, background: surf, border: `1px solid ${border}` }} />
            <div style={{ height: 18, borderRadius: 6, background: grad, opacity: 0.8 }} />
          </div>
          <div style={{ height: 6, borderRadius: 3, background: muted, width: '70%' }} />
          <div style={{ display: 'flex', gap: 4 }}>
            <div style={{ height: 14, flex: 1, borderRadius: 6, background: grad }} />
            <div style={{ height: 14, flex: 1, borderRadius: 6, background: surf, border: `1px solid ${border}` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ThemeClient({ user: _user }: Props) {
  const { theme, setTheme, resolved, accentIndex, setAccentIndex, accent } = useTheme();

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, rgba(var(--c-accent-rgb),0.3), rgba(var(--c-accent2-rgb),0.2))`, border: `1px solid rgba(var(--c-accent-rgb),0.2)` }}>
          <MdPalette size={24} style={{ color: 'var(--c-accent)' }} />
        </div>
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Theme</h1>
          <p className="text-[var(--c-muted)] text-sm">Customize colors — changes apply instantly & persist after reload</p>
        </div>
      </div>

      {/* Color Mode */}
      <div className="rounded-2xl p-6" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)] mb-1">Color Mode</h2>
        <p className="text-[var(--c-muted)] text-xs mb-5">Persists across reload and login</p>
        <div className="grid grid-cols-3 gap-4">
          {THEMES.map(({ id, label, desc, icon: Icon }) => {
            const isActive = theme === id;
            const previewMode = id === 'auto' ? resolved : id;
            return (
              <motion.button key={id} onClick={() => setTheme(id)} whileTap={{ scale: 0.97 }}
                className="relative flex flex-col gap-3 p-4 rounded-2xl text-left transition-all"
                style={{
                  background: isActive ? `linear-gradient(135deg, rgba(var(--c-accent-rgb),0.15), rgba(var(--c-accent2-rgb),0.08))` : 'var(--c-surface2)',
                  border: isActive ? `2px solid rgba(var(--c-accent-rgb),0.4)` : '2px solid var(--c-border)',
                }}>
                <MiniPreview mode={previewMode} accent={accent} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} style={{ color: isActive ? 'var(--c-accent)' : 'var(--c-muted)' }} />
                    <div>
                      <p className="text-sm font-bold" style={{ color: isActive ? 'var(--c-text)' : 'var(--c-muted)' }}>{label}</p>
                      <p className="text-[10px] text-[var(--c-muted)] opacity-70">{desc}</p>
                    </div>
                  </div>
                  {isActive && (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: 'var(--c-accent)' }}>
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
        <p className="text-[var(--c-muted)] text-xs mb-5">Changes buttons, highlights, gradients & glow effects instantly</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {ACCENT_PRESETS.map((preset, i) => {
            const isActive = accentIndex === i;
            return (
              <motion.button key={preset.name} onClick={() => setAccentIndex(i)} whileTap={{ scale: 0.97 }}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: isActive ? `linear-gradient(135deg, ${preset.from}22, ${preset.to}11)` : 'var(--c-surface2)',
                  border: isActive ? `2px solid ${preset.from}66` : '2px solid var(--c-border)',
                }}>
                {/* Color swatch */}
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${preset.from}, ${preset.to})`, flexShrink: 0,
                  boxShadow: isActive ? `0 4px 14px ${preset.from}55` : 'none' }} />
                <div className="text-left flex-1 min-w-0">
                  <p className="text-sm font-bold truncate" style={{ color: isActive ? 'var(--c-text)' : 'var(--c-muted)' }}>{preset.name}</p>
                  <p className="text-[10px] font-mono truncate" style={{ color: preset.from }}>{preset.from}</p>
                </div>
                {isActive && <MdCheck size={16} className="flex-shrink-0" style={{ color: preset.from }} />}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-2xl p-5" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)] mb-4">Live Preview</h2>
        <div className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <button className="btn-primary text-sm">Primary Button</button>
            <button className="btn-secondary text-sm">Secondary</button>
            <button className="btn-danger text-sm">Danger</button>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: '65%' }} /></div>
          <input className="saturn-input" placeholder="Input field preview…" readOnly />
          <p className="gradient-text font-orbitron font-bold text-lg">Gradient Text Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg" style={{ background: 'var(--c-gradient)' }} />
            <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--c-gradient-r)' }} />
            <span className="text-xs font-mono" style={{ color: 'var(--c-accent)' }}>#{accentIndex} — {accent.name}</span>
          </div>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-2xl p-4 flex items-center gap-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: `rgba(var(--c-accent-rgb),0.12)` }}>
          <MdSettingsBrightness size={20} style={{ color: 'var(--c-accent)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--c-text)]">
            Mode: <span style={{ color: 'var(--c-accent)' }} className="capitalize">{theme}</span>
            {' '}· Accent: <span style={{ color: 'var(--c-accent)' }}>{accent.name}</span>
          </p>
          <p className="text-xs text-[var(--c-muted)]">Rendered as <span style={{ color: 'var(--c-accent2)' }} className="capitalize">{resolved}</span> — saved to localStorage, persists on reload & login</p>
        </div>
      </div>
    </div>
  );
}
