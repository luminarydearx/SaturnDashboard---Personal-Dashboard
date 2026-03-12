'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { PublicUser } from '@/types';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  MdCode, MdOpenInNew, MdLock, MdLockOpen, MdRefresh, MdWarning,
  MdCheckCircle, MdVisibility, MdPlayArrow, MdStop,
  MdSchedule, MdImage, MdClose, MdKey, MdPowerSettingsNew,
  MdCalendarToday, MdVideoLibrary, MdInfo, MdUpload,
} from 'react-icons/md';
import { SiGithub } from 'react-icons/si';
import { motion } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTOGEN_URL          = 'https://auto-generator-app.vercel.app';
const AUTOGEN_GITHUB       = 'https://github.com/luminarydearx/SaturnDashboard---Personal-Dashboard';
const AUTOGEN_REPO_OWNER   = process.env.NEXT_PUBLIC_GITHUB_OWNER          || 'luminarydearx';
const AUTOGEN_REPO_NAME    = process.env.NEXT_PUBLIC_GITHUB_REPO           || 'SaturnDashboard---Personal-Dashboard';
const AUTOGEN_PROJECT_PATH = process.env.NEXT_PUBLIC_AUTOGEN_PROJECT_PATH  || 'project/AutoGen';
const BRANCH               = 'master';
const CLOUD_NAME           = 'dg3awuzug';
const UPLOAD_PRESET        = 'ml_default';

// Prepend project/AutoGen/ to a relative path
function agPath(p: string) {
  const base = AUTOGEN_PROJECT_PATH.replace(/\/$/, '');
  const fp   = p.replace(/^\//, '');
  return fp.startsWith(base) ? fp : `${base}/${fp}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Schedule {
  lockdownEnabled:  boolean;
  lockdownAt:       string;   // ISO
  lockdownReason:   string;
  lockdownMediaUrl: string;   // Cloudinary URL
  unlockEnabled:    boolean;
  unlockAt:         string;   // ISO
}

interface LockdownJson {
  active:    boolean;
  reason:    string;
  timestamp: string;
  mediaUrl?: string;
}

const DEFAULT_SCHEDULE: Schedule = {
  lockdownEnabled: false,  lockdownAt:       '',
  lockdownReason:  '',     lockdownMediaUrl: '',
  unlockEnabled:   false,  unlockAt:         '',
};

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props { user: PublicUser }

export default function AutoGenClient({ user: _user }: Props) {
  // Preview
  const [iframeKey,        setIframeKey]       = useState(0);
  const [showIframe,       setShowIframe]      = useState(false);

  // Lockdown
  const [lockdownActive,   setLockdownActive]  = useState(false);
  const [lockdownLoading,  setLockdownLoading] = useState(false);
  const [lockdownReason,   setLockdownReason]  = useState('');
  const [showLockConfirm,  setShowLockConfirm] = useState(false);
  const [showUnlockConf,   setShowUnlockConf]  = useState(false);

  // Push status
  const [pushing,          setPushing]         = useState(false);
  const [pushStatus,       setPushStatus]      = useState('');

  // Schedule
  const [schedule,         setSchedule]        = useState<Schedule>(DEFAULT_SCHEDULE);
  const [schedSaving,      setSchedSaving]     = useState(false);
  const [schedSaved,       setSchedSaved]      = useState(false);

  // Media (for current lockdown)
  const [mediaFile,        setMediaFile]       = useState<File | null>(null);
  const [mediaPreview,     setMediaPreview]    = useState('');
  const [mediaUrl,         setMediaUrl]        = useState('');
  const [uploadingMedia,   setUploadingMedia]  = useState(false);
  const mediaRef                               = useRef<HTMLInputElement>(null);

  // Token — read-only from ENV (via /api/settings), never editable in UI
  const [tokenPreview,     setTokenPreview]    = useState('');
  const [tokenSource,      setTokenSource]     = useState<'env' | 'missing' | ''>('');

  // Restart
  const [restartLoading,   setRestartLoading]  = useState(false);

  const { success, error: toastErr } = useToast();

  // ─── On mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    // 1. Fetch live lockdown status from deployed site
    fetch(`${AUTOGEN_URL}/lockdown.json?_=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: LockdownJson) => {
        setLockdownActive(!!d?.active);
        if (d?.active) { setLockdownReason(d.reason || ''); }
        if (d?.mediaUrl) setMediaUrl(d.mediaUrl);
      })
      .catch(() => {});

    // 2. Load saved schedule
    fetch('/api/autogen/schedule', { cache: 'no-store' })
      .then(r => r.json())
      .then((s: any) => { if (s && !s.error) setSchedule(s as Schedule); })
      .catch(() => {});

    // 3. Token status from ENV (server reads process.env.GITHUB_TOKEN)
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: any) => {
        if (d?.tokenPreview) setTokenPreview(d.tokenPreview);
        if (d?.tokenSource)  setTokenSource(d.tokenSource as 'env' | 'missing');
      })
      .catch(() => {});
  }, []);

  // ─── Schedule polling ─────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (schedule.lockdownEnabled && schedule.lockdownAt && !lockdownActive) {
        if (now >= new Date(schedule.lockdownAt).getTime()) {
          executeLockdown(schedule.lockdownReason, schedule.lockdownMediaUrl, true);
        }
      }
      if (schedule.unlockEnabled && schedule.unlockAt && lockdownActive) {
        if (now >= new Date(schedule.unlockAt).getTime()) {
          executeUnlock(true);
        }
      }
    };
    tick();
    const iv = setInterval(tick, 60_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, lockdownActive]);

  // ─── Push to GitHub (via server API — token stays server-side) ────────────
  const pushToGitHub = async (files: { path: string; content: string }[], msg: string): Promise<boolean> => {
    setPushing(true);
    setPushStatus('Pushing ke GitHub…');
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner: AUTOGEN_REPO_OWNER, repo: AUTOGEN_REPO_NAME, branch: BRANCH, files, message: msg }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setPushStatus('✓ Pushed — Vercel deploying…');
        success('Pushed! Vercel akan deploy dalam ~30 detik');
        setTimeout(() => setPushStatus(''), 6000);
        return true;
      }
      throw new Error(d.error || d.message || d.errors?.join(', ') || 'Push gagal');
    } catch (e: any) {
      toastErr(e.message || 'Push gagal');
      setPushStatus('✗ Push gagal');
      setTimeout(() => setPushStatus(''), 5000);
      return false;
    } finally { setPushing(false); }
  };

  // ─── Cloudinary upload ────────────────────────────────────────────────────
  const uploadToCloudinary = async (file: File): Promise<string> => {
    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload Cloudinary gagal');
      const data = await res.json();
      return data.secure_url as string;
    } finally { setUploadingMedia(false); }
  };

  // ─── Media selection ──────────────────────────────────────────────────────
  const onMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f);
    setMediaUrl('');
    const reader = new FileReader();
    reader.onload = ev => setMediaPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };
  const clearMedia = () => {
    setMediaFile(null); setMediaPreview(''); setMediaUrl('');
    if (mediaRef.current) mediaRef.current.value = '';
  };
  const isVideo = (u: string) => /\.(mp4|webm|mov|avi|ogg)(\?|$)/i.test(u);

  // ─── Execute lockdown ─────────────────────────────────────────────────────
  const executeLockdown = async (reason: string, existingMediaUrl = '', fromSchedule = false) => {
    setLockdownLoading(true);
    try {
      let finalMediaUrl = existingMediaUrl || mediaUrl;

      // Upload new file if selected
      if (mediaFile && !mediaUrl) {
        try {
          finalMediaUrl = await uploadToCloudinary(mediaFile);
          setMediaUrl(finalMediaUrl);
        } catch { toastErr('Upload media gagal — lanjut tanpa media'); }
      }

      const payload: LockdownJson = {
        active: true, reason: reason || '', timestamp: new Date().toISOString(),
        ...(finalMediaUrl ? { mediaUrl: finalMediaUrl } : {}),
      };

      const ok = await pushToGitHub(
        [{ path: agPath('public/lockdown.json'), content: JSON.stringify(payload, null, 2) }],
        `🔒 AutoGen: Lockdown${reason ? ` — ${reason}` : ''}`
      );
      if (ok) {
        setLockdownActive(true);
        if (fromSchedule) {
          const upd = { ...schedule, lockdownEnabled: false };
          setSchedule(upd);
          fetch('/api/autogen/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(upd) }).catch(() => {});
        }
      }
    } finally { setLockdownLoading(false); }
  };

  // ─── Execute unlock ───────────────────────────────────────────────────────
  const executeUnlock = async (fromSchedule = false) => {
    setLockdownLoading(true);
    try {
      const payload: LockdownJson = { active: false, reason: '', timestamp: new Date().toISOString() };
      const ok = await pushToGitHub(
        [{ path: agPath('public/lockdown.json'), content: JSON.stringify(payload, null, 2) }],
        '🔓 AutoGen: Lockdown deactivated'
      );
      if (ok) {
        setLockdownActive(false); setLockdownReason(''); clearMedia();
        if (fromSchedule) {
          const upd = { ...schedule, unlockEnabled: false };
          setSchedule(upd);
          fetch('/api/autogen/schedule', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(upd) }).catch(() => {});
        }
      }
    } finally { setLockdownLoading(false); }
  };

  const handleLockdown  = () => { setShowLockConfirm(false); executeLockdown(lockdownReason); };
  const handleUnlock    = () => { setShowUnlockConf(false);  executeUnlock(); };

  // ─── Save schedule ────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    setSchedSaving(true);
    try {
      const res = await fetch('/api/autogen/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(schedule),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal');
      setSchedSaved(true); setTimeout(() => setSchedSaved(false), 2500);
    } catch (e: any) { toastErr(e.message); } finally { setSchedSaving(false); }
  };

  // ─── Save GitHub token ────────────────────────────────────────────────────
  // ─── Redeploy AutoGen on Vercel ───────────────────────────────────────────
  const restartServer = async () => {
    setRestartLoading(true);
    try {
      const res = await fetch('/api/server/restart', { method: 'POST' });
      const d = await res.json();
      if (d.success) {
        success(`AutoGen redeploy dimulai! Selesai ~30 detik. ${d.deploymentId ? `(ID: ${d.deploymentId})` : ''}`);
      } else {
        // Show actionable error — likely missing env vars
        toastErr(d.message || 'Redeploy gagal');
        if (d.missingVars?.length) {
          console.warn('[AutoGen Restart] Missing env vars:', d.missingVars);
        }
      }
    } catch (e: any) {
      toastErr(e.message || 'Gagal koneksi ke server');
    } finally { setRestartLoading(false); }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const fmtDT = (iso: string) => {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
    catch { return iso; }
  };
  const toLocalDT = (iso: string) => {
    if (!iso) return '';
    try { return new Date(iso).toISOString().slice(0, 16); } catch { return ''; }
  };
  const fromLocalDT = (val: string) => val ? new Date(val).toISOString() : '';

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))', border: '1px solid rgba(var(--c-accent-rgb),.2)' }}>
            <MdCode size={24} style={{ color: 'var(--c-accent)' }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">AutoGen</h1>
            <a href={AUTOGEN_URL} target="_blank" rel="noreferrer"
              className="text-sm flex items-center gap-1 hover:underline" style={{ color: 'var(--c-accent)' }}>
              {AUTOGEN_URL} <MdOpenInNew size={12} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Push status */}
          {pushStatus && (
            <span className="text-xs px-3 py-1.5 rounded-full font-mono"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
              {pushStatus}
            </span>
          )}

          {/* Lockdown status badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{
              background: lockdownActive ? 'rgba(239,68,68,.1)' : 'rgba(34,197,94,.1)',
              border:     lockdownActive ? '1px solid rgba(239,68,68,.3)' : '1px solid rgba(34,197,94,.3)',
              color:      lockdownActive ? '#f87171' : '#4ade80',
            }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: lockdownActive ? '#f87171' : '#4ade80' }} />
            {lockdownActive ? 'LOCKDOWN ACTIVE' : 'ONLINE'}
          </div>

          {/* Quick lock/unlock */}
          {lockdownActive ? (
            <button onClick={() => setShowUnlockConf(true)} disabled={lockdownLoading || pushing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', color: '#4ade80' }}>
              <MdLockOpen size={15} />{(lockdownLoading || pushing) ? '…' : 'Unlock'}
            </button>
          ) : (
            <button onClick={() => setShowLockConfirm(true)} disabled={lockdownLoading || pushing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)', color: '#f87171' }}>
              <MdLock size={15} />{(lockdownLoading || pushing) ? '…' : 'Lockdown'}
            </button>
          )}

          {/* GitHub Token — read-only status from ENV */}
          <div title={tokenSource === 'env' ? `GITHUB_TOKEN: ${tokenPreview}` : 'GITHUB_TOKEN tidak ditemukan di env!'}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono cursor-default"
            style={{
              background: tokenSource === 'env' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
              border:     tokenSource === 'env' ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(239,68,68,.35)',
              color:      tokenSource === 'env' ? '#4ade80' : '#f87171',
            }}>
            <MdKey size={12} />
            {tokenPreview || (tokenSource === 'missing' ? '⚠ NO TOKEN' : '…')}
          </div>

          {/* Restart button */}
          <button onClick={restartServer} disabled={restartLoading} title="Redeploy AutoGen di Vercel"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{ background: 'rgba(var(--c-accent-rgb),.08)', border: '1px solid rgba(var(--c-accent-rgb),.2)', color: 'var(--c-accent)' }}>
            <MdPowerSettingsNew size={14} className={restartLoading ? 'animate-spin' : ''} />
            {restartLoading ? 'Deploying…' : 'Redeploy'}
          </button>

          {/* GitHub link */}
          <a href={AUTOGEN_GITHUB} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
            <SiGithub size={14} />
          </a>
        </div>
      </div>

      {/* TOKEN MISSING WARNING ════════════════════════════════════════════ */}
      {tokenSource === 'missing' && (
        <motion.div initial={{ opacity:0, y:-6 }} animate={{ opacity:1, y:0 }}
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.25)' }}>
          <MdWarning size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-[var(--c-muted)]">
            <span className="font-bold text-red-400">GITHUB_TOKEN tidak ditemukan!</span>
            {' '}Tambahkan di Vercel Dashboard → SaturnDashboard → Settings → Environment Variables →{' '}
            <code className="font-mono bg-black/20 px-1 rounded">GITHUB_TOKEN</code>
            {' '}(Classic PAT, scope:{' '}
            <code className="font-mono bg-black/20 px-1 rounded">repo</code>)
          </p>
        </motion.div>
      )}

      {/* ══ 2-COLUMN LAYOUT: Preview (kiri) — Settings (kanan) ═══════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-5 items-start">

        {/* ── KIRI: PREVIEW ────────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)', minHeight:600 }}>

          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor:'var(--c-border)', background:'var(--c-surface2)' }}>
            <div className="flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--c-muted)]"
              style={{ background:'var(--c-bg)', border:'1px solid var(--c-border)' }}>
              <MdOpenInNew size={12} /> {AUTOGEN_URL}
            </div>
            <button onClick={() => { setShowIframe(true); setIframeKey(p => p + 1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-primary">
              <MdPlayArrow size={14} /> Preview
            </button>
            {showIframe && (
              <>
                <button onClick={() => setIframeKey(p => p + 1)}
                  className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                  style={{ background:'var(--c-surface)', border:'1px solid var(--c-border)' }}>
                  <MdRefresh size={14} />
                </button>
                <button onClick={() => setShowIframe(false)}
                  className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                  style={{ border:'1px solid rgba(239,68,68,.2)' }}>
                  <MdStop size={14} />
                </button>
              </>
            )}
          </div>

          {/* iframe / placeholder */}
          {showIframe ? (
            <iframe key={iframeKey} src={AUTOGEN_URL} className="flex-1 w-full border-0"
              style={{ minHeight:550 }} title="AutoGen Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background:'linear-gradient(135deg,rgba(var(--c-accent-rgb),.2),rgba(var(--c-accent2-rgb),.1))', border:'1px solid rgba(var(--c-accent-rgb),.2)' }}>
                <MdVisibility size={36} style={{ color:'var(--c-accent)' }} />
              </div>
              <div className="text-center">
                <p className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">Live Preview</p>
                <p className="text-[var(--c-muted)] text-sm">Preview website AutoGen secara realtime</p>
              </div>
              <button onClick={() => { setShowIframe(true); setIframeKey(p => p + 1); }} className="btn-primary">
                <MdPlayArrow size={18} /> Load Preview
              </button>
            </div>
          )}
        </motion.div>

        {/* ── KANAN: SETTINGS ───────────────────────────────────────────────── */}
        <motion.div initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }}
          className="flex flex-col gap-5">

            {/* ── LOCKDOWN CONTROL CARD ────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor: 'var(--c-border)', background: 'rgba(239,68,68,.04)' }}>
                <MdLock size={17} className="text-red-400" />
                <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Lockdown Control</h2>
                {lockdownActive && (
                  <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{ background:'rgba(239,68,68,.15)', color:'#f87171', border:'1px solid rgba(239,68,68,.3)' }}>
                    ACTIVE
                  </span>
                )}
              </div>

              <div className="p-5 flex flex-col gap-4">
                {/* Reason */}
                <div>
                  <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
                    Alasan Lockdown <span className="normal-case font-normal">(opsional — ditampilkan ke pengunjung)</span>
                  </label>
                  <textarea value={lockdownReason} onChange={e => setLockdownReason(e.target.value)}
                    placeholder="Contoh: Sedang maintenance, akan kembali segera…"
                    rows={3} className="saturn-input resize-none w-full focus:outline-none"
                    style={{ paddingLeft: 16 }} />
                </div>

                {/* Media upload */}
                <div>
                  <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
                    Media Pendukung <span className="normal-case font-normal">(opsional — gambar atau video)</span>
                  </label>

                  {(mediaPreview || mediaUrl) ? (
                    <div className="relative rounded-xl overflow-hidden"
                      style={{ background:'var(--c-bg)', border:'1px solid var(--c-border)' }}>
                      {((mediaFile?.type.startsWith('video')) || (!mediaPreview && isVideo(mediaUrl))) ? (
                        <video src={mediaPreview || mediaUrl} controls
                          className="w-full max-h-52 object-contain" />
                      ) : (
                        <img src={mediaPreview || mediaUrl} alt="preview"
                          className="w-full max-h-52 object-contain" />
                      )}
                      {mediaUrl && !mediaFile && (
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-1 text-[10px] font-mono truncate"
                          style={{ background:'rgba(0,0,0,.7)', color:'#a5d6ff' }}>
                          {mediaUrl}
                        </div>
                      )}
                      <button onClick={clearMedia}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-80"
                        style={{ background:'rgba(239,68,68,.85)' }}>
                        <MdClose size={14} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => mediaRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed transition-colors hover:border-[var(--c-accent)]"
                      style={{ borderColor:'var(--c-border)', color:'var(--c-muted)' }}>
                      <div className="flex items-center gap-3">
                        <MdImage size={24} /> <MdVideoLibrary size={24} />
                      </div>
                      <span className="text-sm font-medium">Klik untuk upload gambar / video</span>
                      <span className="text-xs opacity-60">JPG, PNG, GIF, MP4, WebM — maks 20MB</span>
                    </button>
                  )}
                  <input ref={mediaRef} type="file" className="hidden"
                    accept="image/*,video/*" onChange={onMediaSelect} />
                  {uploadingMedia && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-[var(--c-muted)]">
                      <MdRefresh size={13} className="animate-spin" /> Mengupload ke Cloudinary…
                    </div>
                  )}
                </div>

                {/* Action button */}
                <div className="pt-1">
                  {lockdownActive ? (
                    <button onClick={() => setShowUnlockConf(true)} disabled={lockdownLoading || pushing}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                      style={{ background:'rgba(34,197,94,.1)', border:'1px solid rgba(34,197,94,.3)', color:'#4ade80' }}>
                      <MdLockOpen size={16} />
                      {(lockdownLoading || pushing) ? 'Memproses…' : '🔓 Unlock Sekarang'}
                    </button>
                  ) : (
                    <button onClick={() => setShowLockConfirm(true)} disabled={lockdownLoading || pushing}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                      style={{ background:'linear-gradient(135deg,#dc2626,#ef4444)' }}>
                      <MdLock size={16} />
                      {(lockdownLoading || pushing) ? 'Memproses…' : '🔒 Aktifkan Lockdown Sekarang'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* ── SCHEDULE CARD ────────────────────────────────────────────── */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{ borderColor:'var(--c-border)', background:'rgba(var(--c-accent-rgb),.04)' }}>
                <MdSchedule size={17} style={{ color:'var(--c-accent)' }} />
                <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Jadwal Otomatis</h2>
              </div>

              <div className="p-5 flex flex-col gap-6">

                {/* ── Auto-lockdown ── */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MdLock size={14} className="text-red-400" />
                      <span className="text-[var(--c-text)] text-sm font-semibold">Auto-Lockdown</span>
                    </div>
                    {/* Toggle */}
                    <button onClick={() => setSchedule(s => ({ ...s, lockdownEnabled: !s.lockdownEnabled }))}
                      className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
                      style={{ background: schedule.lockdownEnabled ? 'var(--c-accent)' : 'var(--c-border)' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                        style={{ left: schedule.lockdownEnabled ? '22px' : '2px' }} />
                    </button>
                  </div>

                  {schedule.lockdownEnabled && (
                    <div className="flex flex-col gap-3 pl-4 border-l-2" style={{ borderColor:'rgba(239,68,68,.3)' }}>
                      <div>
                        <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Waktu Lockdown</label>
                        <input type="datetime-local"
                          value={toLocalDT(schedule.lockdownAt)}
                          onChange={e => setSchedule(s => ({ ...s, lockdownAt: fromLocalDT(e.target.value) }))}
                          className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft:12 }} />
                      </div>
                      <div>
                        <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Alasan</label>
                        <input type="text" value={schedule.lockdownReason}
                          onChange={e => setSchedule(s => ({ ...s, lockdownReason: e.target.value }))}
                          placeholder="Alasan lockdown terjadwal…"
                          className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft:12 }} />
                      </div>
                      <div>
                        <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">
                          URL Media <span className="normal-case font-normal">(opsional — Cloudinary URL)</span>
                        </label>
                        <input type="url" value={schedule.lockdownMediaUrl}
                          onChange={e => setSchedule(s => ({ ...s, lockdownMediaUrl: e.target.value }))}
                          placeholder="https://res.cloudinary.com/…"
                          className="saturn-input w-full focus:outline-none text-sm font-mono" style={{ paddingLeft:12 }} />
                        <p className="text-[var(--c-muted)] text-xs mt-1">
                          Upload media dulu di panel Lockdown Control di atas, lalu paste URL-nya di sini.
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Auto-unlock ── */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MdLockOpen size={14} className="text-green-400" />
                      <span className="text-[var(--c-text)] text-sm font-semibold">Auto-Unlock</span>
                    </div>
                    <button onClick={() => setSchedule(s => ({ ...s, unlockEnabled: !s.unlockEnabled }))}
                      className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
                      style={{ background: schedule.unlockEnabled ? '#22c55e' : 'var(--c-border)' }}>
                      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                        style={{ left: schedule.unlockEnabled ? '22px' : '2px' }} />
                    </button>
                  </div>

                  {schedule.unlockEnabled && (
                    <div className="flex flex-col gap-3 pl-4 border-l-2" style={{ borderColor:'rgba(34,197,94,.3)' }}>
                      <div>
                        <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Waktu Unlock</label>
                        <input type="datetime-local"
                          value={toLocalDT(schedule.unlockAt)}
                          onChange={e => setSchedule(s => ({ ...s, unlockAt: fromLocalDT(e.target.value) }))}
                          className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft:12 }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Save schedule ── */}
                <button onClick={saveSchedule} disabled={schedSaving}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{
                    background: schedSaved ? 'rgba(34,197,94,.1)' : 'var(--c-gradient-r)',
                    border:     schedSaved ? '1px solid rgba(34,197,94,.3)' : 'none',
                    color:      schedSaved ? '#4ade80' : '#fff',
                  }}>
                  {schedSaving
                    ? <><MdRefresh size={14} className="animate-spin" /> Menyimpan…</>
                    : schedSaved
                    ? <><MdCheckCircle size={14} /> Jadwal Disimpan!</>
                    : <><MdCalendarToday size={14} /> Simpan Jadwal</>}
                </button>

                {/* ── Upcoming events preview ── */}
                {((schedule.lockdownEnabled && schedule.lockdownAt) || (schedule.unlockEnabled && schedule.unlockAt)) && (
                  <div className="rounded-xl p-4 flex flex-col gap-2"
                    style={{ background:'var(--c-bg)', border:'1px solid var(--c-border)' }}>
                    <p className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1">
                      Jadwal Tersimpan
                    </p>
                    {schedule.lockdownEnabled && schedule.lockdownAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>🔒</span>
                        <span className="text-[var(--c-text)]">Lockdown:</span>
                        <span className="font-semibold" style={{ color:'var(--c-accent)' }}>{fmtDT(schedule.lockdownAt)}</span>
                      </div>
                    )}
                    {schedule.unlockEnabled && schedule.unlockAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <span>🔓</span>
                        <span className="text-[var(--c-text)]">Unlock:</span>
                        <span className="font-semibold" style={{ color:'var(--c-accent)' }}>{fmtDT(schedule.unlockAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

        </motion.div>{/* end right col */}
      </div>{/* end 2-column grid */}

      {/* ══ LOCKDOWN CONFIRM MODAL ════════════════════════════════════════ */}
      {showLockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <motion.div initial={{ scale:.9, opacity:0 }} animate={{ scale:1, opacity:1 }}
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background:'var(--c-surface)', border:'1px solid rgba(239,68,68,.3)' }}>
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <MdLock className="text-red-500" size={28} />
              </div>
              <h3 className="text-xl font-bold text-[var(--c-text)] text-center mb-2 font-orbitron">Aktifkan Lockdown?</h3>
              <p className="text-sm text-[var(--c-muted)] text-center mb-4 font-nunito">
                Website AutoGen akan menampilkan halaman lockdown ke semua pengunjung.
                Push ke GitHub → Vercel auto-deploy.
              </p>
              {lockdownReason && (
                <div className="px-4 py-3 rounded-xl text-sm mb-3"
                  style={{ background:'var(--c-bg)', border:'1px solid var(--c-border)' }}>
                  <span className="text-[var(--c-muted)]">Alasan: </span>
                  <span className="text-[var(--c-text)]">{lockdownReason}</span>
                </div>
              )}
              {!lockdownReason && (
                <div className="flex items-center gap-2 text-xs text-amber-400 mb-3">
                  <MdWarning size={14} /> Tidak ada alasan yang diberikan
                </div>
              )}
              {(mediaPreview || mediaUrl) && (
                <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] mb-2">
                  <MdImage size={14} style={{ color:'var(--c-accent)' }} />
                  Media akan ditampilkan di halaman lockdown
                </div>
              )}
              {mediaFile && !mediaUrl && (
                <div className="flex items-center gap-2 text-xs text-amber-400 mb-2">
                  <MdUpload size={14} /> Media akan diupload ke Cloudinary saat proses
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4" style={{ background:'rgba(0,0,0,.1)' }}>
              <button onClick={() => setShowLockConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm transition btn-secondary">
                Batal
              </button>
              <button onClick={handleLockdown} disabled={lockdownLoading || pushing}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition flex items-center justify-center gap-2">
                <MdLock size={16} />
                {(lockdownLoading || pushing) ? 'Memproses…' : 'Aktifkan Lockdown'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ══ UNLOCK CONFIRM MODAL ══════════════════════════════════════════ */}
      <ConfirmModal isOpen={showUnlockConf}
        title="Deaktifkan Lockdown?" type="success"
        message="AutoGen akan kembali dapat diakses oleh semua pengunjung. Perubahan di-push ke GitHub → Vercel auto-deploy."
        confirmText="Unlock Site" cancelText="Batal"
        onConfirm={handleUnlock} onCancel={() => setShowUnlockConf(false)}
        isLoading={lockdownLoading || pushing} />
    </div>
  );
}
