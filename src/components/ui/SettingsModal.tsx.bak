'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PublicUser } from '@/types';
import { useToast } from '@/components/ui/Toast';
import GithubPushModal from '@/components/ui/GithubPushModal';
import { SiGithub, SiCloudinary } from 'react-icons/si';
import {
  MdClose, MdCloudUpload, MdInfo, MdSettings, MdKeyboard,
  MdCheckCircle, MdEdit, MdCheck, MdRefresh,
} from 'react-icons/md';
import { format } from 'date-fns';
import {
  ShortcutMap, loadShortcuts, saveShortcuts,
  DEFAULT_SHORTCUTS, SHORTCUT_LABELS, eventToShortcut, displayShortcut,
} from '@/lib/shortcuts';

// ── Types ────────────────────────────────────────────────────────────────────
interface SettingsData {
  githubOwner: string;
  githubRepo:  string;
  lastPush:    string;
}

interface Props {
  open:    boolean;
  onClose: () => void;
  user:    PublicUser;
}

type Tab = 'settings' | 'shortcuts';

// ── InfoBox ──────────────────────────────────────────────────────────────────
function InfoBox({ label, value, isUrl = false }: { label: string; value: string; isUrl?: boolean }) {
  return (
    <div className="rounded-xl p-4 border transition-colors"
      style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--c-muted)' }}>{label}</p>
      <p className={`font-mono text-sm leading-relaxed text-[var(--c-text)] ${isUrl ? 'break-all' : 'truncate'}`} title={value}>
        {value || '—'}
      </p>
    </div>
  );
}

// ── ShortcutsTab ─────────────────────────────────────────────────────────────
function ShortcutsTab() {
  const [shortcuts, setShortcuts]   = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  const [editing,   setEditing]     = useState<keyof ShortcutMap | null>(null);
  const [listening, setListening]   = useState(false);
  const [saved,     setSaved]       = useState(false);
  const editRef = useRef<keyof ShortcutMap | null>(null);
  editRef.current = editing;

  useEffect(() => { setShortcuts(loadShortcuts()); }, []);

  // Capture next keypress when listening
  useEffect(() => {
    if (!listening || !editing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') { setListening(false); setEditing(null); return; }
      const sc = eventToShortcut(e);
      if (!sc) return;
      setShortcuts(prev => ({ ...prev, [editing]: sc }));
      setListening(false);
      setEditing(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [listening, editing]);

  const startEdit = (key: keyof ShortcutMap) => {
    setEditing(key);
    setListening(true);
  };

  const handleSave = () => {
    saveShortcuts(shortcuts);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleReset = () => {
    setShortcuts({ ...DEFAULT_SHORTCUTS });
    saveShortcuts({ ...DEFAULT_SHORTCUTS });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-orbitron text-base font-bold text-[var(--c-text)]">Keyboard Shortcuts</h3>
          <p className="text-xs text-[var(--c-muted)] mt-0.5">Klik tombol edit, lalu tekan kombinasi key yang diinginkan</p>
        </div>
        <button onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
          <MdRefresh size={13} /> Reset Default
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {(Object.keys(shortcuts) as (keyof ShortcutMap)[]).map(key => {
          const isEditing = editing === key && listening;
          return (
            <div key={key}
              className="flex items-center justify-between px-4 py-3 rounded-xl transition-all"
              style={{
                background: isEditing ? 'rgba(var(--c-accent-rgb),.08)' : 'var(--c-surface)',
                border: isEditing ? '1px solid rgba(var(--c-accent-rgb),.3)' : '1px solid var(--c-border)',
              }}>
              <div className="flex items-center gap-3">
                <MdKeyboard size={16} style={{ color: 'var(--c-accent)' }} />
                <span className="text-[var(--c-text)] text-sm font-semibold">{SHORTCUT_LABELS[key]}</span>
              </div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <span className="flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded-lg animate-pulse"
                    style={{ background: 'rgba(var(--c-accent-rgb),.15)', color: 'var(--c-accent)', border: '1px solid rgba(var(--c-accent-rgb),.3)' }}>
                    Tekan key… <span className="text-[10px] opacity-70">(Esc untuk batal)</span>
                  </span>
                ) : (
                  <kbd className="px-3 py-1.5 rounded-lg font-mono text-xs font-bold"
                    style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                    {displayShortcut(shortcuts[key])}
                  </kbd>
                )}
                <button onClick={() => startEdit(key)} disabled={listening && !isEditing}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{
                    background: isEditing ? 'rgba(var(--c-accent-rgb),.2)' : 'var(--c-bg)',
                    border: '1px solid var(--c-border)',
                    color: isEditing ? 'var(--c-accent)' : 'var(--c-muted)',
                  }}>
                  <MdEdit size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={handleSave}
        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
        style={{
          background: saved ? 'rgba(34,197,94,.12)' : 'var(--c-gradient-r)',
          border:     saved ? '1px solid rgba(34,197,94,.3)' : 'none',
          color:      saved ? '#4ade80' : '#fff',
        }}>
        {saved ? <><MdCheckCircle size={16} /> Shortcut Disimpan!</> : <><MdCheck size={16} /> Simpan Shortcuts</>}
      </button>
    </div>
  );
}

// ── SettingsTab ───────────────────────────────────────────────────────────────
function SettingsTab({ user }: { user: PublicUser }) {
  const [settings,        setSettings]        = useState<SettingsData | null>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const [isPushing,       setIsPushing]       = useState(false);
  const { success } = useToast();

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: any) => setSettings({ githubOwner: d.githubOwner || '', githubRepo: d.githubRepo || '', lastPush: d.lastPush || '' }))
      .catch(() => {});
  }, []);

  const cloudName   = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   || 'dg3awuzug';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  return (
    <div className="flex flex-col gap-5">
      {/* GitHub */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
            <SiGithub size={18} className="text-[var(--c-text)]" />
          </div>
          <div>
            <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)]">GitHub Data Sync</h3>
            <p className="text-[10px] text-[var(--c-muted)]">Push JSON data files ke repository</p>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-4" style={{ background: 'var(--c-bg)' }}>
          {settings ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoBox label="Repository Owner" value={settings.githubOwner} />
              <InfoBox label="Repository" value={settings.githubRepo} />
              <InfoBox label="Last Push" value={settings.lastPush ? format(new Date(settings.lastPush), 'MMM d, yyyy HH:mm') : 'Never'} />
              <InfoBox label="Files Synced" value="users.json, notes.json, settings.json" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-[var(--c-muted)] text-sm">
              <MdRefresh size={14} className="animate-spin" /> Loading…
            </div>
          )}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
            style={{ background: 'rgba(59,130,246,.07)', border: '1px solid rgba(59,130,246,.2)' }}>
            <MdInfo size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--c-muted)' }}>
              Token GitHub harus punya scope <code className="font-mono px-1 rounded text-blue-300" style={{ background: 'rgba(0,0,0,.3)' }}>repo</code>.
              Data di-push sebagai JSON. Password disimpan sebagai bcrypt hash.
            </p>
          </div>
          {(user.role === 'owner' || user.role === 'co-owner') && (
            <button onClick={() => { setIsPushing(true); setShowGithubModal(true); }}
              className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center group">
              <MdCloudUpload size={16} className="group-hover:-translate-y-0.5 transition-transform" />
              Push to GitHub
            </button>
          )}
        </div>
      </div>

      {/* Cloudinary */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
            <SiCloudinary size={18} className="text-blue-400" />
          </div>
          <div>
            <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Cloudinary</h3>
            <p className="text-[10px] text-[var(--c-muted)]">Konfigurasi image hosting</p>
          </div>
        </div>
        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ background: 'var(--c-bg)' }}>
          <InfoBox label="Cloud Name" value={cloudName} />
          <InfoBox label="Upload Preset" value={uploadPreset} />
        </div>
      </div>

      {/* System */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
            <MdSettings size={18} className="text-[var(--c-muted)]" />
          </div>
          <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)]">System Information</h3>
        </div>
        <div className="divide-y p-1" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
          {[
            ['Version', 'v5.0.0'],
            ['Framework', 'Next.js 16 + TypeScript'],
            ['Auth', 'JWT (jose) + bcryptjs'],
            ['Storage', 'JSON files'],
            ['Image CDN', 'Cloudinary'],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between items-center px-4 py-3">
              <span className="text-sm font-medium" style={{ color: 'var(--c-muted)' }}>{k}</span>
              <span className="text-sm font-mono px-2 py-0.5 rounded" style={{ color: 'var(--c-text)', background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {showGithubModal && (
        <GithubPushModal
          onClose={() => setShowGithubModal(false)}
          onSuccess={() => {
            setIsPushing(false); setShowGithubModal(false);
            success('Data synced to GitHub!');
          }}
        />
      )}
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────
export default function SettingsModal({ open, onClose, user }: Props) {
  const [tab, setTab] = useState<Tab>('settings');

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'settings',  label: 'Settings',   icon: MdSettings  },
    { id: 'shortcuts', label: 'Shortcuts',  icon: MdKeyboard  },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000]"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
            >
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0"
                style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))', border: '1px solid rgba(var(--c-accent-rgb),.2)' }}>
                  <MdSettings size={18} style={{ color: 'var(--c-accent)' }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-orbitron text-base font-bold text-[var(--c-text)]">Settings</h2>
                  <p className="text-[11px] text-[var(--c-muted)]">System configuration & shortcuts</p>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{ color: 'var(--c-muted)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-muted)')}>
                  <MdClose size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-6 pt-4 flex-shrink-0">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: tab === id ? 'var(--c-gradient-r)' : 'var(--c-surface)',
                      color: tab === id ? '#fff' : 'var(--c-muted)',
                      border: tab === id ? 'none' : '1px solid var(--c-border)',
                      boxShadow: tab === id ? '0 4px 14px rgba(var(--c-accent-rgb),.3)' : 'none',
                    }}>
                    <Icon size={15} /> {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <AnimatePresence mode="wait">
                  <motion.div key={tab}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}>
                    {tab === 'settings'  && <SettingsTab user={user} />}
                    {tab === 'shortcuts' && <ShortcutsTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
