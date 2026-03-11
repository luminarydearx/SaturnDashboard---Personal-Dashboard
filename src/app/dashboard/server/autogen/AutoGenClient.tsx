'use client';
import { useState, useRef, useEffect } from 'react';
import { PublicUser } from '@/types';
import { useToast } from '@/components/ui/Toast';
import ConfirmModal from '@/components/ui/ConfirmModal';
import {
  MdCode, MdLock, MdLockOpen, MdRefresh,
  MdWarning, MdCheckCircle,
  MdSettings, MdSchedule, MdUpload, MdClose, MdImage, MdVideoLibrary,
  MdCalendarToday, MdOpenInNew, MdInfo, MdPlayArrow, MdStop, MdVisibility
} from 'react-icons/md';
import { SiGithub } from 'react-icons/si';
import { motion, AnimatePresence } from 'framer-motion';

// ── Constants ─────────────────────────────────────────────────────────────
const AUTOGEN_URL          = 'https://auto-generator-app.vercel.app'; // Ganti dengan URL deploy Anda
const AUTOGEN_REPO_OWNER   = process.env.NEXT_PUBLIC_GITHUB_OWNER   || 'luminarydearx';
const AUTOGEN_REPO_NAME    = process.env.NEXT_PUBLIC_GITHUB_REPO    || 'SaturnDashboard---Personal-Dashboard';
const AUTOGEN_PROJECT_PATH = process.env.NEXT_PUBLIC_AUTOGEN_PROJECT_PATH || 'project/AutoGen';
const BRANCH               = 'master';
const CLOUD_NAME           = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || 'dg3awuzug';
const UPLOAD_PRESET        = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

// Helper: ensure path is prefixed with project/AutoGen/
function autoGenPath(filePath: string): string {
  const base = AUTOGEN_PROJECT_PATH.replace(/\/$/, '');
  const fp   = filePath.replace(/^\//, '');
  if (fp.startsWith(base)) return fp;
  return `${base}/${fp}`;
}

// ── Types ─────────────────────────────────────────────────────────────────
interface Schedule {
  lockdownEnabled: boolean; lockdownAt: string;
  lockdownReason: string; lockdownMediaUrl: string;
  unlockEnabled: boolean; unlockAt: string;
}
interface LockdownData {
  active: boolean; reason: string; timestamp: string; mediaUrl?: string;
}

// ── Main ──────────────────────────────────────────────────────────────────
interface Props { user: PublicUser }

const DEFAULT_SCHEDULE: Schedule = { 
  lockdownEnabled:false, lockdownAt:'', lockdownReason:'', lockdownMediaUrl:'', 
  unlockEnabled:false, unlockAt:'' 
};

export default function AutoGenClient({ user }: Props) {
  // Ubah default tab menjadi 'preview'
  const [tab, setTab]                     = useState<'preview'|'settings'>('preview');
  
  const [lockdownActive, setLockdownActive] = useState(false);
  const [lockdownLoading, setLockdownLoading] = useState(false);
  const [lockdownReason, setLockdownReason]   = useState('');
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [pushing, setPushing]               = useState(false);
  const [pushStatus, setPushStatus]         = useState('');
  
  const [schedule, setSchedule]             = useState<Schedule>(DEFAULT_SCHEDULE);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaved, setScheduleSaved]   = useState(false);
  
  const [mediaFile, setMediaFile]           = useState<File|null>(null);
  const [mediaPreview, setMediaPreview]     = useState('');
  const [mediaUrl, setMediaUrl]             = useState('');
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaInputRef                       = useRef<HTMLInputElement>(null);
  
  const [iframeKey, setIframeKey]           = useState(0);
  const [showIframe, setShowIframe]         = useState(false);

  const { success, error: toastErr, info }  = useToast();

  // ── On mount: load status + schedule ──────────────────────────────────
  useEffect(() => {
    fetch(`${AUTOGEN_URL}/lockdown.json?t=${Date.now()}`, { cache:'no-store' })
      .then(r => r.json())
      .then((d: LockdownData) => {
        setLockdownActive(!!d?.active);
        if (d?.active && d.reason) setLockdownReason(d.reason);
        if (d?.mediaUrl) setMediaUrl(d.mediaUrl);
      })
      .catch(() => {});
    
    fetch('/api/autogen/schedule', { cache:'no-store' })
      .then(r => r.json())
      .then((s: any) => { if (s && !s.error) setSchedule(s as Schedule); })
      .catch(() => {});
  }, []);

  // ── Schedule poll every 60s ────────────────────────────────────────────
  useEffect(() => {
    const check = () => {
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
    check();
    const iv = setInterval(check, 60_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, lockdownActive]);

  // ── Push via server API ────────────────────────────────────────────────
  const pushToGitHub = async (files: {path:string;content:string}[], message: string): Promise<boolean> => {
    setPushing(true); setPushStatus('Pushing to GitHub…');
    try {
      const res = await fetch('/api/github/push', {
        method: 'POST', headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ owner:AUTOGEN_REPO_OWNER, repo:AUTOGEN_REPO_NAME, branch:BRANCH, files, message }),
      });
      const d = await res.json();
      if (d.success) { 
        setPushStatus('✓ Pushed — Vercel deploying…'); 
        success('Pushed! Vercel deploying in ~30s'); 
        setTimeout(()=>setPushStatus(''),5000); 
        return true; 
      }
      throw new Error(d.error||d.message||'Push failed');
    } catch (err: any) {
      toastErr(err.message||'Push failed'); 
      setPushStatus('✗ Push failed'); 
      setTimeout(()=>setPushStatus(''),4000); 
      return false;
    } finally { setPushing(false); }
  };

  // ── Cloudinary upload ──────────────────────────────────────────────────
  const uploadMedia = async (file: File): Promise<string> => {
    setUploadingMedia(true);
    try {
      const fd = new FormData(); fd.append('file',file); fd.append('upload_preset',UPLOAD_PRESET);
      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,{method:'POST',body:fd});
      if (!res.ok) throw new Error('Cloudinary upload failed');
      return (await res.json()).secure_url as string;
    } finally { setUploadingMedia(false); }
  };

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    setMediaFile(file); setMediaUrl('');
    const r = new FileReader(); r.onload = ev => setMediaPreview(ev.target?.result as string); r.readAsDataURL(file);
  };

  const removeMedia = () => { setMediaFile(null); setMediaPreview(''); setMediaUrl(''); if(mediaInputRef.current) mediaInputRef.current.value=''; };

  // ── Execute lockdown ───────────────────────────────────────────────────
  const executeLockdown = async (reason: string, existingMedia='', fromSchedule=false) => {
    setLockdownLoading(true);
    try {
      let finalMedia = existingMedia || (mediaUrl && !mediaFile ? mediaUrl : '');
      if (mediaFile && !mediaUrl) {
        try { finalMedia = await uploadMedia(mediaFile); setMediaUrl(finalMedia); }
        catch { toastErr('Media upload gagal — lanjut tanpa media'); }
      }
      const data: LockdownData = { active:true, reason:reason||'', timestamp:new Date().toISOString(), ...(finalMedia?{mediaUrl:finalMedia}:{}) };
      const ok = await pushToGitHub([{ path:autoGenPath('public/lockdown.json'), content:JSON.stringify(data,null,2) }],
        `🔒 AutoGen: Lockdown${reason?` — ${reason}`:''}`);
      if (ok) {
        setLockdownActive(true);
        if (fromSchedule) {
          const upd = {...schedule,lockdownEnabled:false};
          setSchedule(upd);
          await fetch('/api/autogen/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(upd)});
        }
      }
    } finally { setLockdownLoading(false); }
  };

  const executeUnlock = async (fromSchedule=false) => {
    setLockdownLoading(true);
    try {
      const data: LockdownData = { active:false, reason:'', timestamp:new Date().toISOString() };
      const ok = await pushToGitHub([{ path:autoGenPath('public/lockdown.json'), content:JSON.stringify(data,null,2) }], '🔓 AutoGen: Lockdown deactivated');
      if (ok) {
        setLockdownActive(false); setLockdownReason(''); setMediaUrl(''); setMediaFile(null); setMediaPreview('');
        if (fromSchedule) {
          const upd = {...schedule,unlockEnabled:false};
          setSchedule(upd);
          await fetch('/api/autogen/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(upd)});
        }
      }
    } finally { setLockdownLoading(false); }
  };

  const handleLockdown   = () => { setShowLockConfirm(false);   executeLockdown(lockdownReason); };
  const handleUnlockdown = () => { setShowUnlockConfirm(false); executeUnlock(); };

  // ── Save schedule ──────────────────────────────────────────────────────
  const saveSchedule = async () => {
    setScheduleLoading(true);
    try {
      const res = await fetch('/api/autogen/schedule',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(schedule)});
      const d = await res.json();
      if (d.success) { setScheduleSaved(true); setTimeout(()=>setScheduleSaved(false),2500); }
      else throw new Error(d.error||'Failed');
    } catch(err:any) { toastErr(err.message); } finally { setScheduleLoading(false); }
  };

  const isVideo = (u:string) => /\.(mp4|webm|mov|avi)(\?|$)/i.test(u);
  const fmtTime = (iso:string) => { try { return new Date(iso).toLocaleString('id-ID',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return iso; } };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{background:'linear-gradient(135deg,rgba(var(--c-accent-rgb),0.3),rgba(var(--c-accent2-rgb),0.2))',border:'1px solid rgba(var(--c-accent-rgb),0.2)'}}>
            <MdCode size={24} style={{color:'var(--c-accent)'}}/>
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">AutoGen Control</h1>
            <a href={AUTOGEN_URL} target="_blank" rel="noreferrer"
              className="text-sm hover:underline flex items-center gap-1" style={{color:'var(--c-accent)'}}>
              {AUTOGEN_URL} <MdOpenInNew size={12}/>
            </a>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {pushStatus && (
            <span className="text-xs px-3 py-1.5 rounded-full font-mono"
              style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',color:'var(--c-muted)'}}>
              {pushStatus}
            </span>
          )}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{background:lockdownActive?'rgba(239,68,68,0.1)':'rgba(34,197,94,0.1)',border:lockdownActive?'1px solid rgba(239,68,68,0.3)':'1px solid rgba(34,197,94,0.3)',color:lockdownActive?'#f87171':'#4ade80'}}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{background:lockdownActive?'#f87171':'#4ade80'}}/>
            {lockdownActive?'LOCKDOWN ACTIVE':'ONLINE'}
          </div>
          {lockdownActive ? (
            <button onClick={()=>setShowUnlockConfirm(true)} disabled={lockdownLoading||pushing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',color:'#4ade80'}}>
              <MdLockOpen size={16}/>{(lockdownLoading||pushing)?'Processing…':'Unlock Site'}
            </button>
          ) : (
            <button onClick={()=>setShowLockConfirm(true)} disabled={lockdownLoading||pushing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#f87171'}}>
              <MdLock size={16}/>{(lockdownLoading||pushing)?'Processing…':'Lockdown Now'}
            </button>
          )}
          <a href={`https://github.com/${AUTOGEN_REPO_OWNER}/${AUTOGEN_REPO_NAME}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
            style={{background:'var(--c-surface)',border:'1px solid var(--c-border)'}}>
            <SiGithub size={15}/>
          </a>
        </div>
      </div>

      {/* Tabs - Preview & Settings Only */}
      <div className="flex gap-1"
        style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',padding:5,borderRadius:14}}>
        {([
          {id:'preview', label:'Preview', icon:MdVisibility},
          {id:'settings', label:'Settings', icon:MdSettings}
        ] as const).map(({id,label,icon:Icon})=>(
          <button key={id} onClick={()=>setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all"
            style={{background:tab===id?'var(--c-gradient-r)':'transparent',color:tab===id?'#fff':'var(--c-muted)',boxShadow:tab===id?`0 4px 14px rgba(var(--c-accent-rgb),0.35)`:'none'}}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ──────── PREVIEW TAB ──────── */}
        {tab === 'preview' && (
          <motion.div key="preview" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="rounded-2xl overflow-hidden flex flex-col"
            style={{background:'var(--c-surface)',border:'1px solid var(--c-border)',minHeight:600}}>
            
            {/* Toolbar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
              style={{borderColor:'var(--c-border)',background:'var(--c-surface2)'}}>
              <div className="flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--c-muted)]"
                style={{background:'var(--c-bg)',border:'1px solid var(--c-border)'}}>
                <MdOpenInNew size={12} /> {AUTOGEN_URL.replace('https://', '')}
              </div>
              <button onClick={() => { setShowIframe(true); setIframeKey(p => p+1); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all btn-primary">
                <MdPlayArrow size={14} /> Load Preview
              </button>
              {showIframe && (
                <>
                  <button onClick={() => setIframeKey(p => p+1)}
                    className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                    style={{background:'var(--c-surface)',border:'1px solid var(--c-border)'}}>
                    <MdRefresh size={15} />
                  </button>
                  <button onClick={() => setShowIframe(false)}
                    className="p-2 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
                    style={{border:'1px solid rgba(239,68,68,0.2)'}}>
                    <MdStop size={15} />
                  </button>
                </>
              )}
            </div>

            {/* Content */}
            {showIframe ? (
              <iframe
                key={iframeKey}
                src={AUTOGEN_URL}
                className="flex-1 w-full border-0"
                style={{ minHeight: 550 }}
                title="AutoGen Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20">
                <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                  style={{background:'linear-gradient(135deg,rgba(var(--c-accent-rgb),0.2),rgba(var(--c-accent2-rgb),0.1))',border:'1px solid rgba(var(--c-accent-rgb),0.2)'}}>
                  <MdVisibility size={36} style={{color:'var(--c-accent)'}} />
                </div>
                <div className="text-center">
                  <p className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">Live Preview</p>
                  <p className="text-[var(--c-muted)] text-sm">Preview your AutoGen website in realtime</p>
                  <p className="text-[var(--c-muted)] text-xs mt-1 font-mono">{AUTOGEN_URL.replace('https://', '')}</p>
                </div>
                <button onClick={() => { setShowIframe(true); setIframeKey(p => p+1); }} className="btn-primary">
                  <MdPlayArrow size={18} /> Load Preview
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ──────── SETTINGS TAB ──────── */}
        {tab === 'settings' && (
          <motion.div key="settings" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
            className="flex flex-col gap-5">
            
            {/* Info Card */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl text-sm"
              style={{background:'rgba(var(--c-accent-rgb),0.08)',border:'1px solid rgba(var(--c-accent-rgb),0.2)'}}>
              <MdInfo size={18} className="flex-shrink-0 mt-0.5" style={{color:'var(--c-accent)'}}/>
              <p className="text-[var(--c-muted)] leading-relaxed font-nunito text-xs">
                Lockdown bekerja dengan push <code className="text-[var(--c-accent)] font-mono">project/AutoGen/public/lockdown.json</code> ke repo{' '}
                <strong className="text-[var(--c-text)]">{AUTOGEN_REPO_NAME}</strong> (branch <code className="text-[var(--c-accent)] font-mono">{BRANCH}</code>).
                Vercel auto-deploy → site terkunci. Berfungsi dari localhost maupun production.
              </p>
            </div>

            {/* Lockdown Control */}
            <div className="rounded-2xl overflow-hidden" style={{background:'var(--c-surface)',border:'1px solid var(--c-border)'}}>
              <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{borderColor:'var(--c-border)',background:'rgba(239,68,68,0.05)'}}>
                <MdLock size={18} className="text-red-400"/>
                <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Lockdown Control</h2>
                {lockdownActive && (
                  <span className="ml-auto text-xs px-2.5 py-1 rounded-full font-semibold"
                    style={{background:'rgba(239,68,68,0.15)',color:'#f87171',border:'1px solid rgba(239,68,68,0.3)'}}>
                    ACTIVE
                  </span>
                )}
              </div>
              <div className="p-5 flex flex-col gap-4">
                {/* Reason */}
                <div>
                  <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
                    Alasan Lockdown <span className="normal-case font-normal">(ditampilkan ke pengunjung)</span>
                  </label>
                  <textarea value={lockdownReason} onChange={e=>setLockdownReason(e.target.value)}
                    placeholder="Contoh: Sedang maintenance, akan kembali segera…"
                    rows={3} className="saturn-input resize-none w-full focus:outline-none" style={{paddingLeft:16}}/>
                </div>
                
                {/* Media Upload */}
                <div>
                  <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
                    Media Pendukung <span className="normal-case font-normal">(opsional — gambar / video)</span>
                  </label>
                  {(mediaPreview||mediaUrl) ? (
                    <div className="relative rounded-xl overflow-hidden" style={{background:'var(--c-bg)',border:'1px solid var(--c-border)'}}>
                      {((mediaPreview&&mediaFile?.type.startsWith('video'))||(!mediaPreview&&isVideo(mediaUrl))) ? (
                        <video src={mediaPreview||mediaUrl} controls className="w-full max-h-48 object-contain"/>
                      ) : (
                        <img src={mediaPreview||mediaUrl} alt="media preview" className="w-full max-h-48 object-contain"/>
                      )}
                      {mediaUrl&&!mediaFile && (
                        <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 text-[10px] font-mono truncate"
                          style={{background:'rgba(0,0,0,0.7)',color:'#a5d6ff'}}>{mediaUrl}</div>
                      )}
                      <button onClick={removeMedia}
                        className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
                        style={{background:'rgba(239,68,68,0.8)'}}>
                        <MdClose size={14}/>
                      </button>
                    </div>
                  ) : (
                    <button onClick={()=>mediaInputRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 py-8 rounded-xl border-2 border-dashed transition-colors hover:border-[var(--c-accent)]"
                      style={{borderColor:'var(--c-border)',color:'var(--c-muted)'}}>
                      <div className="flex items-center gap-3"><MdImage size={24}/><MdVideoLibrary size={24}/></div>
                      <span className="text-sm font-medium">Klik untuk upload gambar / video</span>
                      <span className="text-xs opacity-60">JPG, PNG, GIF, MP4, WebM — maks 20MB</span>
                    </button>
                  )}
                  <input ref={mediaInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleMediaSelect}/>
                  {uploadingMedia && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-[var(--c-muted)]">
                      <MdRefresh size={13} className="animate-spin"/> Mengupload ke Cloudinary…
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <div className="pt-1">
                  {lockdownActive ? (
                    <button onClick={()=>setShowUnlockConfirm(true)} disabled={lockdownLoading||pushing}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                      style={{background:'rgba(34,197,94,0.1)',border:'1px solid rgba(34,197,94,0.3)',color:'#4ade80'}}>
                      <MdLockOpen size={16}/>{(lockdownLoading||pushing)?'Memproses…':'🔓 Unlock Sekarang'}
                    </button>
                  ) : (
                    <button onClick={()=>setShowLockConfirm(true)} disabled={lockdownLoading||pushing}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                      style={{background:'linear-gradient(135deg,#dc2626,#ef4444)'}}>
                      <MdLock size={16}/>{(lockdownLoading||pushing)?'Memproses…':'🔒 Aktifkan Lockdown Sekarang'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Scheduled Lockdown */}
            <div className="rounded-2xl overflow-hidden" style={{background:'var(--c-surface)',border:'1px solid var(--c-border)'}}>
              <div className="flex items-center gap-3 px-5 py-4 border-b"
                style={{borderColor:'var(--c-border)',background:'rgba(var(--c-accent-rgb),0.04)'}}>
                <MdSchedule size={18} style={{color:'var(--c-accent)'}}/>
                <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Jadwal Otomatis</h2>
              </div>
              <div className="p-5 flex flex-col gap-6">
                {/* Lockdown Schedule */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MdLock size={15} className="text-red-400"/>
                      <span className="text-[var(--c-text)] text-sm font-semibold">Jadwal Lockdown Otomatis</span>
                    </div>
                    <button onClick={()=>setSchedule(s=>({...s,lockdownEnabled:!s.lockdownEnabled}))}
                      className="w-11 h-6 rounded-full transition-all flex-shrink-0 relative"
                      style={{background:schedule.lockdownEnabled?'var(--c-accent)':'var(--c-border)'}}>
                      <span className="absolute top-0.5 rounded-full w-5 h-5 bg-white transition-all shadow-sm"
                        style={{left:schedule.lockdownEnabled?'22px':'2px'}}/>
                    </button>
                  </div>
                  {schedule.lockdownEnabled && (
                    <div className="flex flex-col gap-3 pl-4 border-l-2" style={{borderColor:'rgba(239,68,68,0.3)'}}>
                      <div>
                        <label className="block text-[var(--c-muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Waktu Lockdown</label>
                        <input type="datetime-local"
                          value={schedule.lockdownAt?schedule.lockdownAt.slice(0,16):''}
                          onChange={e=>setSchedule(s=>({...s,lockdownAt:e.target.value?new Date(e.target.value).toISOString():''}))}
                          className="saturn-input w-full focus:outline-none text-sm" style={{paddingLeft:12}}/>
                      </div>
                      <div>
                        <label className="block text-[var(--c-muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Alasan</label>
                        <input type="text" value={schedule.lockdownReason}
                          onChange={e=>setSchedule(s=>({...s,lockdownReason:e.target.value}))}
                          placeholder="Alasan lockdown terjadwal…"
                          className="saturn-input w-full focus:outline-none text-sm" style={{paddingLeft:12}}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* Unlock Schedule */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MdLockOpen size={15} className="text-green-400"/>
                      <span className="text-[var(--c-text)] text-sm font-semibold">Jadwal Unlock Otomatis</span>
                    </div>
                    <button onClick={()=>setSchedule(s=>({...s,unlockEnabled:!s.unlockEnabled}))}
                      className="w-11 h-6 rounded-full transition-all flex-shrink-0 relative"
                      style={{background:schedule.unlockEnabled?'#22c55e':'var(--c-border)'}}>
                      <span className="absolute top-0.5 rounded-full w-5 h-5 bg-white transition-all shadow-sm"
                        style={{left:schedule.unlockEnabled?'22px':'2px'}}/>
                    </button>
                  </div>
                  {schedule.unlockEnabled && (
                    <div className="flex flex-col gap-3 pl-4 border-l-2" style={{borderColor:'rgba(34,197,94,0.3)'}}>
                      <div>
                        <label className="block text-[var(--c-muted)] text-xs font-semibold mb-1.5 uppercase tracking-wider">Waktu Unlock</label>
                        <input type="datetime-local"
                          value={schedule.unlockAt?schedule.unlockAt.slice(0,16):''}
                          onChange={e=>setSchedule(s=>({...s,unlockAt:e.target.value?new Date(e.target.value).toISOString():''}))}
                          className="saturn-input w-full focus:outline-none text-sm" style={{paddingLeft:12}}/>
                      </div>
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <button onClick={saveSchedule} disabled={scheduleLoading}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                  style={{background:scheduleSaved?'rgba(34,197,94,0.1)':'var(--c-gradient-r)',border:scheduleSaved?'1px solid rgba(34,197,94,0.3)':'none',color:scheduleSaved?'#4ade80':'#fff'}}>
                  {scheduleLoading?<><MdRefresh size={14} className="animate-spin"/> Menyimpan…</>
                  :scheduleSaved?<><MdCheckCircle size={14}/> Jadwal Disimpan!</>
                  :<><MdCalendarToday size={14}/> Simpan Jadwal</>}
                </button>

                {/* Upcoming Events */}
                {((schedule.lockdownEnabled&&schedule.lockdownAt)||(schedule.unlockEnabled&&schedule.unlockAt)) && (
                  <div className="rounded-xl p-4 flex flex-col gap-2" style={{background:'var(--c-bg)',border:'1px solid var(--c-border)'}}>
                    <p className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1">Upcoming Events</p>
                    {schedule.lockdownEnabled&&schedule.lockdownAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-red-400">🔒</span>
                        <span className="text-[var(--c-text)]">Lockdown:</span>
                        <span className="font-semibold" style={{color:'var(--c-accent)'}}>{fmtTime(schedule.lockdownAt)}</span>
                      </div>
                    )}
                    {schedule.unlockEnabled&&schedule.unlockAt && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-green-400">🔓</span>
                        <span className="text-[var(--c-text)]">Unlock:</span>
                        <span className="font-semibold" style={{color:'var(--c-accent)'}}>{fmtTime(schedule.unlockAt)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lockdown Confirm Modal */}
      {showLockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{background:'var(--c-surface)',border:'1px solid rgba(239,68,68,0.3)'}}>
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                <MdLock className="text-red-500" size={28}/>
              </div>
              <h3 className="text-xl font-bold text-[var(--c-text)] text-center mb-2 font-orbitron">Aktifkan Lockdown?</h3>
              <p className="text-sm text-[var(--c-muted)] text-center mb-4 font-nunito">
                Website AutoGen akan menampilkan halaman lockdown ke semua pengunjung.<br/>
                File di-push ke GitHub → Vercel deploy otomatis.
              </p>
              {lockdownReason
                ? <div className="px-4 py-3 rounded-xl text-sm mb-2" style={{background:'var(--c-bg)',border:'1px solid var(--c-border)'}}>
                    <span className="text-[var(--c-muted)]">Alasan: </span><span className="text-[var(--c-text)]">{lockdownReason}</span>
                  </div>
                : <div className="flex items-center gap-2 text-xs text-amber-400 mb-2"><MdWarning size={14}/> Tidak ada alasan yang diberikan</div>
              }
              {(mediaPreview||mediaUrl) && (
                <div className="flex items-center gap-2 text-xs text-[var(--c-muted)] mb-2">
                  <MdImage size={14} style={{color:'var(--c-accent)'}}/> Media akan ditampilkan di halaman lockdown
                </div>
              )}
              {mediaFile&&!mediaUrl && (
                <div className="flex items-center gap-2 text-xs text-amber-400 mb-2">
                  <MdUpload size={14}/> Media akan diupload ke Cloudinary saat proses lockdown
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4" style={{background:'rgba(0,0,0,0.1)'}}>
              <button onClick={()=>setShowLockConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm transition btn-secondary">Batal</button>
              <button onClick={handleLockdown} disabled={lockdownLoading||pushing}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition flex items-center justify-center gap-2">
                <MdLock size={16}/>{(lockdownLoading||pushing)?'Memproses…':'Aktifkan Lockdown'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <ConfirmModal isOpen={showUnlockConfirm}
        title="Deaktifkan Lockdown?" type="success"
        message="AutoGen akan kembali dapat diakses. Perubahan di-push ke GitHub dan Vercel deploy otomatis."
        confirmText="Unlock Site" cancelText="Batal"
        onConfirm={handleUnlockdown} onCancel={()=>setShowUnlockConfirm(false)}
        isLoading={lockdownLoading||pushing}/>
    </div>
  );
}