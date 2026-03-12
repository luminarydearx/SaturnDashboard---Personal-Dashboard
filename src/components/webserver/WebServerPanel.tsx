'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { PublicUser } from '@/types';
import { useToast } from '@/components/ui/Toast';
import {
  MdLock, MdLockOpen, MdWarning, MdCheck, MdRefresh, MdOpenInNew,
  MdCampaign, MdBarChart, MdSchedule, MdClose, MdUpload, MdImage,
  MdInfo, MdCheckCircle, MdError, MdNotifications, MdDelete,
  MdRocketLaunch, MdBugReport, MdSwapHoriz,
} from 'react-icons/md';
import { SiGithub } from 'react-icons/si';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

// ── Types ──────────────────────────────────────────────────────────────────────
export interface WSConfig {
  id:              string;
  name:            string;
  url:             string;
  githubOwner:     string;
  githubRepo:      string;
  vercelProjectId: string;
}

type Env = 'production' | 'staging';
type Tab = 'lockdown' | 'announce' | 'analytics' | 'schedule';
type AnnounceType = 'info' | 'warning' | 'success' | 'error';

interface LockdownState { active: boolean; reason?: string; timestamp?: string; mediaUrl?: string }
interface AnnounceState { active: boolean; message?: string; type?: AnnounceType; link?: string; linkText?: string }

const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || 'dg3awuzug';
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

const ANNOUNCE_TYPES: { id: AnnounceType; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'info',    label: 'Info',    icon: MdInfo,        color: 'text-blue-400'  },
  { id: 'success', label: 'Success', icon: MdCheckCircle, color: 'text-green-400' },
  { id: 'warning', label: 'Warning', icon: MdWarning,     color: 'text-amber-400' },
  { id: 'error',   label: 'Error',   icon: MdError,       color: 'text-red-400'   },
];

// ── EnvironmentBadge ───────────────────────────────────────────────────────────
function EnvBadge({ env }: { env: Env }) {
  return env === 'production' ? (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(220,38,38,.12)', color: '#f87171', border: '1px solid rgba(220,38,38,.25)' }}>
      <MdRocketLaunch size={9} /> PRODUCTION
    </span>
  ) : (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{ background: 'rgba(245,158,11,.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.25)' }}>
      <MdBugReport size={9} /> STAGING
    </span>
  );
}

// ── EnvironmentSelector ────────────────────────────────────────────────────────
function EnvSelector({ env, onChange }: { env: Env; onChange: (e: Env) => void }) {
  return (
    <div className="flex items-center rounded-xl overflow-hidden flex-shrink-0"
      style={{ border: '1px solid var(--c-border)', background: 'var(--c-bg)' }}>
      {(['production', 'staging'] as Env[]).map(e => (
        <button key={e} onClick={() => onChange(e)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold transition-all"
          style={{
            background: env === e
              ? (e === 'production' ? 'rgba(220,38,38,.15)' : 'rgba(245,158,11,.12)')
              : 'transparent',
            color: env === e
              ? (e === 'production' ? '#f87171' : '#fbbf24')
              : 'var(--c-muted)',
            borderRight: e === 'production' ? '1px solid var(--c-border)' : 'none',
          }}>
          {e === 'production' ? <MdRocketLaunch size={11} /> : <MdBugReport size={11} />}
          {e === 'production' ? 'Production' : 'Staging'}
        </button>
      ))}
    </div>
  );
}

// ── Main Panel ─────────────────────────────────────────────────────────────────
export default function WebServerPanel({ user, config }: { user: PublicUser; config: WSConfig }) {
  const [env,      setEnv]      = useState<Env>('production');
  const [tab,      setTab]      = useState<Tab>('lockdown');
  const [lockdown, setLockdown] = useState<LockdownState | null>(null);
  const [announce, setAnnounce] = useState<AnnounceState | null>(null);
  const [loading,  setLoading]  = useState(true);

  // Lockdown form
  const [reason,        setReason]        = useState('');
  const [mediaFile,     setMediaFile]     = useState<File | null>(null);
  const [mediaPreview,  setMediaPreview]  = useState('');
  const [mediaUrl,      setMediaUrl]      = useState('');
  const [uploadingMedia,setUploadingMedia]= useState(false);
  const [locking,       setLocking]       = useState(false);
  const [unlocking,     setUnlocking]     = useState(false);
  const [showLockConf,  setShowLockConf]  = useState(false);
  const [showUnlockConf,setShowUnlockConf]= useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);

  // Announce form
  const [aMsg,    setAMsg]    = useState('');
  const [aType,   setAType]   = useState<AnnounceType>('info');
  const [aLink,   setALink]   = useState('');
  const [aLinkTxt,setALinkTxt]= useState('');
  const [aSaving, setASaving] = useState(false);

  // Schedule
  const [sched, setSched] = useState({
    lockdownEnabled: false, lockdownAt: '',
    lockdownReason: '', lockdownMediaUrl: '',
    unlockEnabled: false, unlockAt: '',
  });
  const [schedMediaFile,    setSchedMediaFile]    = useState<File | null>(null);
  const [schedMediaPreview, setSchedMediaPreview] = useState('');
  const [schedMediaUrl,     setSchedMediaUrl]     = useState('');
  const [schedSaving,       setSchedSaving]       = useState(false);
  const schedMediaRef = useRef<HTMLInputElement>(null);

  // Analytics
  const [analyticsData,    setAnalyticsData]    = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsMock,    setAnalyticsMock]    = useState(true);
  const [period,           setPeriod]           = useState('7d');

  const { success, error: toastErr } = useToast();
  const canManage = ['owner', 'co-owner'].includes(user.role);

  // Branch name based on environment
  const branch = env === 'production' ? 'master' : 'staging';

  // ── Fetch live status ─────────────────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [lRes, aRes] = await Promise.all([
        fetch(`/api/webserver/lockdown?id=${config.id}&branch=${branch}`),
        fetch(`/api/webserver/announce?id=${config.id}&branch=${branch}`),
      ]);
      const lData = lRes.ok ? await lRes.json() : { active: false };
      const aData = aRes.ok ? await aRes.json() : { active: false };
      setLockdown(lData);
      setAnnounce(aData);
      if (aData?.message) {
        setAMsg(aData.message);
        setAType(aData.type || 'info');
        setALink(aData.link || '');
        setALinkTxt(aData.linkText || '');
      }
    } catch (e: any) {
      toastErr('Gagal fetch status');
    } finally {
      setLoading(false);
    }
  }, [config.id, branch, toastErr]);

  // Re-fetch when env changes
  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  useEffect(() => {
    const t = setInterval(fetchStatus, 30_000);
    return () => clearInterval(t);
  }, [fetchStatus]);

  // ── Analytics ─────────────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/webserver/analytics?id=${config.id}&period=${period}`);
      const d   = await res.json();
      setAnalyticsData(d.data || []);
      setAnalyticsMock(d.mock !== false);
    } catch { setAnalyticsData([]); } finally { setAnalyticsLoading(false); }
  }, [config.id, period]);

  useEffect(() => { if (tab === 'analytics') fetchAnalytics(); }, [tab, fetchAnalytics]);

  // ── Cloudinary upload ─────────────────────────────────────────────────────
  const uploadToCloudinary = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('upload_preset', UPLOAD_PRESET);
    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, { method: 'POST', body: fd });
    if (!res.ok) throw new Error('Upload Cloudinary gagal');
    return (await res.json()).secure_url as string;
  };

  const handleMediaSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { toastErr('Hanya file gambar'); return; }
    setMediaFile(file); setMediaPreview(URL.createObjectURL(file)); setMediaUrl('');
  };

  const handleSchedMediaSelect = (file: File) => {
    if (!file.type.startsWith('image/')) { toastErr('Hanya file gambar'); return; }
    setSchedMediaFile(file); setSchedMediaPreview(URL.createObjectURL(file)); setSchedMediaUrl('');
  };

  // ── Lock ──────────────────────────────────────────────────────────────────
  const executeLock = async () => {
    setShowLockConf(false); setLocking(true);
    try {
      let finalMedia = mediaUrl;
      if (mediaFile && !mediaUrl) {
        try { finalMedia = await uploadToCloudinary(mediaFile); setMediaUrl(finalMedia); }
        catch { toastErr('Upload media gagal, lanjut tanpa media'); }
      }
      const res = await fetch('/api/webserver/lockdown', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: config.id, action: 'lock', reason, mediaUrl: finalMedia, branch }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Lock gagal');
      success(`🔒 ${config.name} [${env}] berhasil di-lockdown!`);
      await fetchStatus();
      setReason(''); setMediaFile(null); setMediaPreview(''); setMediaUrl('');
    } catch (e: any) { toastErr(e.message); } finally { setLocking(false); }
  };

  // ── Unlock ────────────────────────────────────────────────────────────────
  const executeUnlock = async () => {
    setShowUnlockConf(false); setUnlocking(true);
    try {
      const res = await fetch('/api/webserver/lockdown', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: config.id, action: 'unlock', branch }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Unlock gagal');
      success(`🔓 ${config.name} [${env}] berhasil di-unlock!`);
      await fetchStatus();
    } catch (e: any) { toastErr(e.message); } finally { setUnlocking(false); }
  };

  // ── Save Announce ─────────────────────────────────────────────────────────
  const saveAnnounce = async (active: boolean) => {
    setASaving(true);
    try {
      const res = await fetch('/api/webserver/announce', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: config.id, active, message: aMsg, type: aType, link: aLink, linkText: aLinkTxt, branch }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal');
      success(active ? `📢 Announcement [${env}] dipublish!` : '🗑️ Announcement dihapus!');
      await fetchStatus();
    } catch (e: any) { toastErr(e.message); } finally { setASaving(false); }
  };

  // ── Save Schedule ─────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    setSchedSaving(true);
    try {
      let finalMedia = schedMediaUrl || sched.lockdownMediaUrl;
      if (schedMediaFile && !schedMediaUrl) {
        setUploadingMedia(true);
        try { finalMedia = await uploadToCloudinary(schedMediaFile); setSchedMediaUrl(finalMedia); }
        catch { toastErr('Upload gagal'); } finally { setUploadingMedia(false); }
      }
      const payload = { ...sched, lockdownMediaUrl: finalMedia };
      const res = await fetch('/api/webserver/schedule', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: config.id, schedule: payload }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal');
      success('⏰ Jadwal disimpan!');
    } catch (e: any) { toastErr(e.message); } finally { setSchedSaving(false); }
  };

  const isLocked    = lockdown?.active === true;
  const hasAnnounce = announce?.active === true;
  const siteUrl     = env === 'production' ? config.url : '#';

  return (
    <div className="flex flex-col gap-5">

      {/* ── Environment Selector Bar ── */}
      <div className="rounded-2xl p-4 flex items-center justify-between gap-4"
        style={{
          background: env === 'production'
            ? 'linear-gradient(135deg,rgba(220,38,38,.06),rgba(147,51,234,.04))'
            : 'linear-gradient(135deg,rgba(245,158,11,.06),rgba(234,179,8,.03))',
          border: env === 'production' ? '1px solid rgba(220,38,38,.2)' : '1px solid rgba(245,158,11,.2)',
        }}>
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="font-orbitron font-bold text-sm text-[var(--c-text)]">Target</span>
              <EnvBadge env={env} />
            </div>
            <p className="text-[11px]" style={{ color: 'var(--c-muted)' }}>
              {env === 'production'
                ? `🌐 Affects live users — branch: master`
                : `🧪 Test safely — branch: staging (tidak terlihat user)`}
            </p>
          </div>
        </div>
        <EnvSelector env={env} onChange={e => { setEnv(e); }} />
      </div>

      {/* Staging warning */}
      {env === 'staging' && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)' }}>
          <MdBugReport size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed" style={{ color: 'var(--c-muted)' }}>
            <span className="font-bold text-amber-400">Mode Staging</span> — Semua aksi push ke branch{' '}
            <code className="font-mono px-1 rounded" style={{ background: 'rgba(0,0,0,.3)', color: '#fbbf24' }}>staging</code>.
            User di production <strong className="text-[var(--c-text)]">tidak terpengaruh</strong>.{' '}
            Pastikan branch <code className="font-mono px-1 rounded" style={{ background: 'rgba(0,0,0,.3)', color: '#fbbf24' }}>staging</code> sudah dibuat di GitHub terlebih dahulu.
          </div>
        </motion.div>
      )}

      {/* Production warning */}
      {env === 'production' && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.2)' }}>
          <MdWarning size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed" style={{ color: 'var(--c-muted)' }}>
            <span className="font-bold text-red-400">Mode Production</span> — Aksi akan langsung memengaruhi{' '}
            <strong className="text-[var(--c-text)]">semua user</strong> yang mengakses {config.name}.
          </p>
        </motion.div>
      )}

      {/* ── Status Bar ── */}
      <div className="rounded-2xl p-5 flex items-center justify-between gap-4"
        style={{
          background: isLocked ? 'linear-gradient(135deg,rgba(220,38,38,.1),rgba(147,51,234,.07))' : 'linear-gradient(135deg,rgba(34,197,94,.07),rgba(59,130,246,.05))',
          border: isLocked ? '1px solid rgba(220,38,38,.3)' : '1px solid rgba(34,197,94,.2)',
        }}>
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: isLocked ? 'rgba(220,38,38,.15)' : 'rgba(34,197,94,.1)', border: isLocked ? '1px solid rgba(220,38,38,.25)' : '1px solid rgba(34,197,94,.18)' }}>
            {loading
              ? <MdRefresh size={20} className="animate-spin" style={{ color: 'var(--c-accent)' }} />
              : isLocked ? <MdLock size={20} className="text-red-400" /> : <MdLockOpen size={20} className="text-green-400" />}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-orbitron font-bold text-[var(--c-text)]">{config.name}</span>
              <EnvBadge env={env} />
              {hasAnnounce && (
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
                  style={{ background: 'rgba(245,158,11,.1)', color: '#fbbf24', border: '1px solid rgba(245,158,11,.2)' }}>
                  <MdCampaign size={9} /> ANN
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-xs font-bold ${isLocked ? 'text-red-400' : 'text-green-400'}`}>
                {loading ? 'Checking…' : isLocked ? 'LOCKDOWN ACTIVE' : 'ONLINE'}
              </span>
              {lockdown?.timestamp && (
                <span className="text-[10px] font-mono" style={{ color: 'var(--c-muted)' }}>
                  · {new Date(lockdown.timestamp).toLocaleString('id-ID')}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={fetchStatus} className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
            <MdRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          {env === 'production' && (
            <a href={config.url} target="_blank" rel="noopener"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-opacity hover:opacity-80"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
              <MdOpenInNew size={12} /> Buka Site
            </a>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-2 flex-wrap">
        {([
          { id: 'lockdown',  label: 'Lockdown',      icon: MdLock     },
          { id: 'announce',  label: 'Announcement',   icon: MdCampaign },
          { id: 'analytics', label: 'Analytics',      icon: MdBarChart },
          { id: 'schedule',  label: 'Schedule',       icon: MdSchedule },
        ] as const).map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: tab === t.id ? 'var(--c-accent)' : 'var(--c-surface)',
                color:      tab === t.id ? '#fff' : 'var(--c-muted)',
                border:     tab === t.id ? 'none' : '1px solid var(--c-border)',
              }}>
              <Icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      <AnimatePresence mode="wait">
        <motion.div key={`${tab}-${env}`}
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

          {/* ════ LOCKDOWN ════ */}
          {tab === 'lockdown' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Lockdown Control</p>
                <EnvBadge env={env} />
              </div>
              <div className="p-5 flex flex-col gap-4">
                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-muted)' }}>Alasan Lockdown</label>
                  <input value={reason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setReason(e.target.value)}
                    placeholder="Maintenance, update, dll…" className="saturn-input w-full text-sm"
                    disabled={!canManage} />
                </div>

                {/* Media upload */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-muted)' }}>
                    Media (opsional) — diupload ke Cloudinary otomatis
                  </label>
                  {mediaPreview ? (
                    <div className="relative w-full h-36 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--c-border)' }}>
                      <Image src={mediaPreview} alt="preview" fill style={{ objectFit: 'cover' }} />
                      <button onClick={() => { setMediaFile(null); setMediaPreview(''); setMediaUrl(''); }}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/60">
                        <MdClose size={12} className="text-white" />
                      </button>
                      {mediaUrl && (
                        <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70">
                          <MdCheckCircle size={10} className="text-green-400" />
                          <span className="text-[9px] text-green-400 font-mono">Uploaded ✓</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => mediaRef.current?.click()}
                      className="w-full h-24 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm"
                      style={{ borderColor: 'var(--c-border)', color: 'var(--c-muted)', background: 'var(--c-bg)' }}
                      disabled={!canManage}>
                      <MdImage size={18} /> Pilih Gambar
                    </button>
                  )}
                  <input ref={mediaRef} type="file" accept="image/*" className="hidden"
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleMediaSelect(f); }} />
                  {mediaFile && !mediaUrl && (
                    <button onClick={async () => {
                      setUploadingMedia(true);
                      try { const u = await uploadToCloudinary(mediaFile); setMediaUrl(u); }
                      catch (e: any) { toastErr('Upload gagal'); } finally { setUploadingMedia(false); }
                    }} disabled={uploadingMedia}
                      className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                      style={{ background: 'var(--c-accent)' }}>
                      {uploadingMedia ? <><MdRefresh size={12} className="animate-spin" /> Uploading…</> : <><MdUpload size={12} /> Upload Sekarang</>}
                    </button>
                  )}
                </div>

                {/* Active lockdown info */}
                {isLocked && lockdown?.reason && (
                  <div className="px-4 py-3 rounded-xl" style={{ background: 'rgba(220,38,38,.07)', border: '1px solid rgba(220,38,38,.2)' }}>
                    <p className="text-xs font-semibold text-red-400 mb-1">Active Reason:</p>
                    <p className="text-sm text-[var(--c-text)]">{lockdown.reason}</p>
                    {lockdown.mediaUrl && (
                      <div className="relative mt-2 h-20 rounded-lg overflow-hidden">
                        <Image src={lockdown.mediaUrl} alt="media" fill style={{ objectFit: 'cover' }} />
                      </div>
                    )}
                  </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-1">
                  <button onClick={() => setShowLockConf(true)}
                    disabled={!canManage || locking || isLocked}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                    style={{ background: isLocked ? 'rgba(255,255,255,.05)' : 'linear-gradient(135deg,#dc2626,#9333ea)', opacity: (!canManage || isLocked) ? 0.4 : 1 }}>
                    {locking ? <><MdRefresh size={15} className="animate-spin" /> Locking…</> : <><MdLock size={15} /> {isLocked ? 'Sudah Locked' : 'Lockdown'}</>}
                  </button>
                  <button onClick={() => setShowUnlockConf(true)}
                    disabled={!canManage || unlocking || !isLocked}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                    style={{ background: isLocked ? 'rgba(34,197,94,.1)' : 'var(--c-bg)', border: '1px solid ' + (isLocked ? 'rgba(34,197,94,.3)' : 'var(--c-border)'), color: isLocked ? '#4ade80' : 'var(--c-muted)', opacity: (!canManage || !isLocked) ? 0.4 : 1 }}>
                    {unlocking ? <><MdRefresh size={15} className="animate-spin" /> Unlocking…</> : <><MdLockOpen size={15} /> Unlock</>}
                  </button>
                </div>

                <a href={`https://github.com/${config.githubOwner}/${config.githubRepo}/blob/${branch}/public/lockdown.json`}
                  target="_blank" rel="noopener"
                  className="flex items-center gap-2 text-xs hover:opacity-80 transition-opacity"
                  style={{ color: 'var(--c-muted)' }}>
                  <SiGithub size={11} /> View lockdown.json [{branch}] on GitHub
                </a>
              </div>
            </div>
          )}

          {/* ════ ANNOUNCE ════ */}
          {tab === 'announce' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Announcement Bar</p>
                <div className="flex items-center gap-2">
                  {hasAnnounce && <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1"><MdNotifications size={10} /> AKTIF</span>}
                  <EnvBadge env={env} />
                </div>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold mb-2" style={{ color: 'var(--c-muted)' }}>Tipe</label>
                  <div className="flex gap-2 flex-wrap">
                    {ANNOUNCE_TYPES.map(t => {
                      const Icon = t.icon;
                      return (
                        <button key={t.id} onClick={() => setAType(t.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                          style={{
                            background: aType === t.id ? 'rgba(var(--c-accent-rgb),.15)' : 'var(--c-bg)',
                            border: aType === t.id ? '1px solid rgba(var(--c-accent-rgb),.35)' : '1px solid var(--c-border)',
                            color: aType === t.id ? 'var(--c-accent)' : 'var(--c-muted)',
                          }}>
                          <Icon size={12} className={aType === t.id ? '' : t.color} /> {t.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-muted)' }}>Pesan</label>
                  <textarea value={aMsg} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAMsg(e.target.value)} rows={3}
                    placeholder="Sistem sedang dalam pembaruan…" className="saturn-input w-full text-sm resize-none"
                    disabled={!canManage} />
                </div>

                {/* Link */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-muted)' }}>Link (opsional)</label>
                    <input value={aLink} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setALink(e.target.value)} placeholder="https://…" className="saturn-input w-full text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold mb-1.5" style={{ color: 'var(--c-muted)' }}>Teks Link</label>
                    <input value={aLinkTxt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setALinkTxt(e.target.value)} placeholder="Pelajari selengkapnya" className="saturn-input w-full text-sm" />
                  </div>
                </div>

                {/* Preview */}
                {aMsg && (
                  <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                    style={{
                      background: aType === 'error' ? 'rgba(220,38,38,.1)' : aType === 'warning' ? 'rgba(245,158,11,.1)' : aType === 'success' ? 'rgba(34,197,94,.1)' : 'rgba(59,130,246,.1)',
                      border:     aType === 'error' ? '1px solid rgba(220,38,38,.3)' : aType === 'warning' ? '1px solid rgba(245,158,11,.3)' : aType === 'success' ? '1px solid rgba(34,197,94,.3)' : '1px solid rgba(59,130,246,.3)',
                    }}>
                    {(() => { const Icon = ANNOUNCE_TYPES.find(t => t.id === aType)!.icon; return <Icon size={16} className={ANNOUNCE_TYPES.find(t => t.id === aType)!.color} />; })()}
                    <span className="flex-1 text-[var(--c-text)]">{aMsg}</span>
                    {aLink && aLinkTxt && <span className="text-xs underline" style={{ color: 'var(--c-accent)' }}>{aLinkTxt}</span>}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => saveAnnounce(true)} disabled={!canManage || !aMsg || aSaving}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
                    style={{ background: 'linear-gradient(135deg,var(--c-accent),var(--c-accent2))', opacity: !aMsg ? 0.4 : 1 }}>
                    {aSaving ? <MdRefresh size={14} className="animate-spin" /> : <MdCampaign size={14} />} Publish [{env}]
                  </button>
                  {hasAnnounce && (
                    <button onClick={() => saveAnnounce(false)} disabled={aSaving}
                      className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
                      style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
                      <MdDelete size={14} /> Hapus
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ════ ANALYTICS ════ */}
          {tab === 'analytics' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Web Analytics</p>
                    {analyticsMock && <p className="text-[10px] mt-0.5 text-amber-400">* Simulasi — set VERCEL_TOKEN untuk data nyata</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    {['7d','14d','30d'].map((p: string) => (
                      <button key={p} onClick={() => setPeriod(p)}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                        style={{ background: period === p ? 'var(--c-accent)' : 'var(--c-bg)', color: period === p ? '#fff' : 'var(--c-muted)', border: period === p ? 'none' : '1px solid var(--c-border)' }}>
                        {p}
                      </button>
                    ))}
                    <button onClick={fetchAnalytics} className="p-1.5 rounded-lg" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                      <MdRefresh size={13} className={analyticsLoading ? 'animate-spin' : ''} style={{ color: 'var(--c-muted)' }} />
                    </button>
                  </div>
                </div>

                {analyticsData.length > 0 && (() => {
                  const tv = analyticsData.reduce((a: number, d: any) => a + (d.views || 0), 0);
                  const tvis = analyticsData.reduce((a: number, d: any) => a + (d.visitors || 0), 0);
                  const avg  = Math.round(tv / analyticsData.length);
                  return (
                    <div className="grid grid-cols-3 gap-3">
                      {[{label:'Total Views',val:tv,color:'var(--c-accent)'},{label:'Total Visitors',val:tvis,color:'#22c55e'},{label:'Avg/Day',val:avg,color:'#f59e0b'}].map(s => (
                        <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                          <p className="text-lg font-bold font-orbitron" style={{ color: s.color }}>{s.val.toLocaleString()}</p>
                          <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: 'var(--c-muted)' }}>{s.label}</p>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {analyticsLoading ? (
                  <div className="flex items-center justify-center h-48"><MdRefresh size={24} className="animate-spin" style={{ color: 'var(--c-accent)' }} /></div>
                ) : analyticsData.length > 0 ? (
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={analyticsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                        <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--c-muted)' }} />
                        <YAxis tick={{ fontSize: 10, fill: 'var(--c-muted)' }} />
                        <Tooltip contentStyle={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 8, fontSize: 12 }} labelStyle={{ color: 'var(--c-text)' }} />
                        <Legend wrapperStyle={{ fontSize: 11, color: 'var(--c-muted)' }} />
                        <Line type="monotone" dataKey="views"    stroke="var(--c-accent)" strokeWidth={2} dot={false} name="Views"    />
                        <Line type="monotone" dataKey="visitors" stroke="#22c55e"          strokeWidth={2} dot={false} name="Visitors" />
                        <Line type="monotone" dataKey="sessions" stroke="#f59e0b"          strokeWidth={1.5} dot={false} name="Sessions" strokeDasharray="4 2" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-12" style={{ color: 'var(--c-muted)' }}>
                    <MdBarChart size={32} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">Tidak ada data analytics</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════ SCHEDULE ════ */}
          {tab === 'schedule' && (
            <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
                <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Jadwal Otomatis</p>
                <EnvBadge env={env} />
              </div>
              <div className="p-5 flex flex-col gap-4">
                {/* Auto lockdown */}
                <div className="rounded-xl p-4" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold flex items-center gap-2 text-[var(--c-text)]">
                      <MdLock size={14} className="text-red-400" /> Auto-Lockdown
                    </span>
                    <button onClick={() => setSched((s: typeof sched) => ({ ...s, lockdownEnabled: !s.lockdownEnabled }))}
                      className="w-10 h-5 rounded-full transition-all flex items-center px-0.5"
                      style={{ background: sched.lockdownEnabled ? 'var(--c-accent)' : 'var(--c-border)' }}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${sched.lockdownEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  {sched.lockdownEnabled && (
                    <div className="flex flex-col gap-3">
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--c-muted)' }}>Waktu Lockdown</label>
                        <input type="datetime-local"
                          value={sched.lockdownAt ? new Date(sched.lockdownAt).toISOString().slice(0,16) : ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSched((s: typeof sched) => ({ ...s, lockdownAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                          className="saturn-input w-full text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--c-muted)' }}>Alasan</label>
                        <input value={sched.lockdownReason} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSched((s: typeof sched) => ({ ...s, lockdownReason: e.target.value }))}
                          placeholder="Maintenance terjadwal…" className="saturn-input w-full text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--c-muted)' }}>Media (opsional)</label>
                        {schedMediaPreview ? (
                          <div className="relative h-28 rounded-xl overflow-hidden border" style={{ borderColor: 'var(--c-border)' }}>
                            <Image src={schedMediaPreview} alt="preview" fill style={{ objectFit: 'cover' }} />
                            <button onClick={() => { setSchedMediaFile(null); setSchedMediaPreview(''); setSchedMediaUrl(''); setSched((s: typeof sched) => ({ ...s, lockdownMediaUrl: '' })); }}
                              className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center">
                              <MdClose size={12} className="text-white" />
                            </button>
                            {schedMediaUrl && (
                              <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70">
                                <MdCheckCircle size={10} className="text-green-400" />
                                <span className="text-[9px] text-green-400">Uploaded ✓</span>
                              </div>
                            )}
                          </div>
                        ) : (
                          <button onClick={() => schedMediaRef.current?.click()}
                            className="w-full h-20 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm"
                            style={{ borderColor: 'var(--c-border)', color: 'var(--c-muted)', background: 'var(--c-surface)' }}>
                            <MdImage size={16} /> Pilih Gambar
                          </button>
                        )}
                        <input ref={schedMediaRef} type="file" accept="image/*" className="hidden"
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleSchedMediaSelect(f); }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Auto unlock */}
                <div className="rounded-xl p-4" style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold flex items-center gap-2 text-[var(--c-text)]">
                      <MdLockOpen size={14} className="text-green-400" /> Auto-Unlock
                    </span>
                    <button onClick={() => setSched((s: typeof sched) => ({ ...s, unlockEnabled: !s.unlockEnabled }))}
                      className="w-10 h-5 rounded-full transition-all flex items-center px-0.5"
                      style={{ background: sched.unlockEnabled ? '#22c55e' : 'var(--c-border)' }}>
                      <div className={`w-4 h-4 rounded-full bg-white shadow transition-all ${sched.unlockEnabled ? 'translate-x-5' : ''}`} />
                    </button>
                  </div>
                  {sched.unlockEnabled && (
                    <div className="mt-3">
                      <label className="text-xs font-semibold block mb-1" style={{ color: 'var(--c-muted)' }}>Waktu Unlock</label>
                      <input type="datetime-local"
                        value={sched.unlockAt ? new Date(sched.unlockAt).toISOString().slice(0,16) : ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSched((s: typeof sched) => ({ ...s, unlockAt: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
                        className="saturn-input w-full text-sm" />
                    </div>
                  )}
                </div>

                <button onClick={saveSchedule} disabled={schedSaving || (!sched.lockdownEnabled && !sched.unlockEnabled)}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg,var(--c-accent),var(--c-accent2))', opacity: (!sched.lockdownEnabled && !sched.unlockEnabled) ? 0.4 : 1 }}>
                  {schedSaving ? <><MdRefresh size={15} className="animate-spin" /> Menyimpan…</> : <><MdCheck size={15} /> Simpan Jadwal [{env}]</>}
                </button>
              </div>
            </div>
          )}

        </motion.div>
      </AnimatePresence>

      {/* ── Confirm Modals ── */}
      <AnimatePresence>
        {(showLockConf || showUnlockConf) && (() => {
          const isLockModal = showLockConf;
          return (
            <>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
                onClick={() => { setShowLockConf(false); setShowUnlockConf(false); }} />
              <div className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                  className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                  style={{ background: 'var(--c-surface)', border: isLockModal ? '1px solid rgba(220,38,38,.35)' : '1px solid rgba(34,197,94,.35)' }}>
                  <div className="p-6 text-center">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                      style={{ background: isLockModal ? 'rgba(220,38,38,.1)' : 'rgba(34,197,94,.1)' }}>
                      {isLockModal ? <MdLock size={28} className="text-red-400" /> : <MdLockOpen size={28} className="text-green-400" />}
                    </div>
                    <h3 className="font-orbitron text-base font-bold text-[var(--c-text)] mb-2">
                      {isLockModal ? `Lockdown ${config.name}?` : `Unlock ${config.name}?`}
                    </h3>
                    <div className="flex justify-center mb-3"><EnvBadge env={env} /></div>
                    <p className="text-sm text-[var(--c-muted)] mb-1">
                      {env === 'production'
                        ? (isLockModal ? `⚠️ Live users akan melihat halaman maintenance.` : `Website akan kembali online untuk semua user.`)
                        : (isLockModal ? `Branch staging akan di-lockdown. Production aman.` : `Branch staging akan di-unlock.`)}
                    </p>
                    {reason && isLockModal && (
                      <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ background: 'rgba(0,0,0,.2)', color: 'var(--c-muted)' }}>
                        Reason: {reason}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3 p-4" style={{ background: 'rgba(0,0,0,.1)' }}>
                    <button onClick={() => { setShowLockConf(false); setShowUnlockConf(false); }}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm"
                      style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                      Batal
                    </button>
                    <button onClick={isLockModal ? executeLock : executeUnlock}
                      className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white"
                      style={{ background: isLockModal ? 'linear-gradient(135deg,#dc2626,#9333ea)' : 'linear-gradient(135deg,#16a34a,#0284c7)' }}>
                      {isLockModal ? 'Ya, Lockdown' : 'Ya, Unlock'}
                    </button>
                  </div>
                </motion.div>
              </div>
            </>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
