"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdBackup, MdClose, MdCloudUpload, MdDownload,
  MdCheck, MdWarning, MdSchedule, MdRefresh,
} from "react-icons/md";
import { SiGithub } from "react-icons/si";
import {
  getBackupStatus, isBackupDue, runFullBackup,
  downloadLocalBackup, pushGithubBackup,
  type BackupStatusData,
} from "@/lib/autoBackup";
import { formatDistanceToNow, format } from "date-fns";

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  try { return formatDistanceToNow(new Date(iso), { addSuffix: true }); }
  catch { return "Unknown"; }
}

interface Props {
  autoTrigger?: boolean;
}

export default function BackupStatus({ autoTrigger = true }: Props) {
  const [open,       setOpen]       = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [status,     setStatus]     = useState<BackupStatusData | null>(null);
  const [running,    setRunning]    = useState<null | "local" | "github" | "full">(null);
  const [log,        setLog]        = useState<string[]>([]);
  const [done,       setDone]       = useState(false);
  
  // ── FIX: Tambahkan state untuk tracking status 'due' ────────────────
  const [backupIsDue, setBackupIsDue] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  // ────────────────────────────────────────────────────────────────────

  const refresh = useCallback(() => {
    try {
      setStatus(getBackupStatus());
    } catch (e) {
      console.error('Failed to get backup status:', e);
    }
  }, []);

  useEffect(() => {
    // Tandai bahwa client sudah siap (hydrated)
    setIsClientReady(true);

    refresh();
    
    // ── FIX: Pindahkan logika isBackupDue() ke sini ───────────────────
    try {
      const due = isBackupDue();
      setBackupIsDue(due);

      if (autoTrigger && due) {
        const t = setTimeout(() => setShowPrompt(true), 4000);
        return () => clearTimeout(t);
      }
    } catch (e) {
      console.error('Error checking backup due:', e);
    }
  }, [autoTrigger, refresh]);

  const addLog = (msg: string) => setLog(p => [...p.slice(-9), msg]);

  const handleFull = async () => {
    setRunning("full"); setDone(false); setLog([]);
    addLog("⏳ Starting full backup…");
    try {
      await runFullBackup((step, success, err) => {
        if (step === "local")  addLog(success ? "✅ Local ZIP downloaded" : `❌ Local: ${err}`);
        if (step === "github") addLog(success ? "✅ Pushed to GitHub"     : `⚠️ GitHub: ${err}`);
      });
      setDone(true);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message || 'Unknown error'}`);
    } finally {
      setRunning(null);
      refresh();
      setShowPrompt(false);
      // Re-calculate due status after backup
      try { setBackupIsDue(isBackupDue()); } catch {}
    }
  };

  const handleLocal = async () => {
    setRunning("local");
    addLog("⏳ Downloading local backup…");
    try {
      await downloadLocalBackup();
      addLog("✅ ZIP downloaded to your device");
    } catch (e: any) {
      addLog(`❌ Error: ${e.message || 'Unknown error'}`);
    } finally {
      setRunning(null);
      refresh();
      try { setBackupIsDue(isBackupDue()); } catch {}
    }
  };

  const handleGithub = async () => {
    setRunning("github");
    addLog("⏳ Pushing to GitHub…");
    try {
      const r = await pushGithubBackup();
      addLog(r.success ? "✅ Backup pushed to GitHub" : `❌ ${r.error}`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message || 'Unknown error'}`);
    } finally {
      setRunning(null);
      refresh();
      try { setBackupIsDue(isBackupDue()); } catch {}
    }
  };

  const isRunning = running !== null;

  // ── FIX: Gunakan state 'backupIsDue' untuk className, bukan panggil fungsi langsung ──
  // Saat SSR (isClientReady=false), gunakan tampilan default (tidak pulse)
  const buttonClassName = `fixed bottom-6 left-6 z-[7999] w-10 h-10 rounded-xl flex items-center justify-center
    shadow-lg transition-all duration-300 border
    ${isClientReady && backupIsDue 
      ? "bg-amber-500/20 text-amber-400 border-amber-500/40 animate-pulse" 
      : "bg-[var(--c-surface)] text-[var(--c-muted)] border-[var(--c-border)] hover:text-[var(--c-text)]"}`;

  return (
    <>
      {/* ── Due Prompt ── */}
      <AnimatePresence>
        {showPrompt && (
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className="fixed bottom-6 right-6 z-[8000] w-80 rounded-2xl shadow-2xl overflow-hidden"
            style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)" }}>
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <MdBackup size={18} className="text-amber-400" />
              </div>
              <div className="flex-1">
                <p className="text-[var(--c-text)] text-sm font-bold">Backup Due</p>
                <p className="text-[var(--c-muted)] text-xs">Last backup: {timeAgo(status?.lastLocal ?? null)}</p>
              </div>
              <button onClick={() => setShowPrompt(false)} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1">
                <MdClose size={16} />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-[var(--c-muted)] text-xs">Auto backup runs every 24 hours. Back up now?</p>
              <div className="flex gap-2">
                <button onClick={handleFull} disabled={isRunning} className="flex-1 btn-primary py-2 text-xs justify-center">
                  <MdBackup size={14} /> Backup Now
                </button>
                <button onClick={() => { setShowPrompt(false); setOpen(true); }}
                  className="px-3 py-2 rounded-xl text-xs text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                  style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                  Options
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Floating Trigger Button ── */}
      <button
        onClick={() => { setOpen(true); refresh(); setLog([]); setDone(false); }}
        title="Backup Manager"
        className={buttonClassName}>
        <MdBackup size={18} />
      </button>

      {/* ── Backup Modal ── */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[8500] bg-black/60 backdrop-blur-sm"
              onClick={() => !isRunning && setOpen(false)} />
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1,    opacity: 1, y: 0  }}
              exit={{    scale: 0.95, opacity: 0, y: 10 }}
              className="fixed z-[8600] inset-x-4 sm:inset-x-auto sm:right-6 sm:w-96 bottom-6 rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)" }}>

              {/* Header */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
                <div className="w-8 h-8 rounded-xl bg-violet-600/20 flex items-center justify-center">
                  <MdBackup size={17} className="text-violet-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Backup Manager</h3>
                  <p className="text-[var(--c-muted)] text-xs">users · notes · settings</p>
                </div>
                <button onClick={() => setOpen(false)} disabled={isRunning}
                  className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1.5 rounded-lg disabled:opacity-30">
                  <MdClose size={18} />
                </button>
              </div>

              {/* Status grid */}
              <div className="grid grid-cols-2 gap-3 p-4 border-b" style={{ borderColor: "var(--c-border)" }}>
                <div className="rounded-xl p-3" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-1 flex items-center gap-1">
                    <MdDownload size={10} /> Last Local
                  </p>
                  <p className="text-[var(--c-text)] text-xs font-mono font-semibold truncate">{timeAgo(status?.lastLocal ?? null)}</p>
                  {status?.lastLocal && (
                    <p className="text-[var(--c-muted)] text-[9px] mt-0.5 font-mono truncate">
                      {format(new Date(status.lastLocal), "dd/MM/yy HH:mm")}
                    </p>
                  )}
                </div>
                <div className="rounded-xl p-3" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-1 flex items-center gap-1">
                    <SiGithub size={10} /> Last GitHub
                  </p>
                  <p className="text-[var(--c-text)] text-xs font-mono font-semibold truncate">{timeAgo(status?.lastGithub ?? null)}</p>
                  {status?.lastGithub && (
                    <p className="text-[var(--c-muted)] text-[9px] mt-0.5 font-mono truncate">
                      {format(new Date(status.lastGithub), "dd/MM/yy HH:mm")}
                    </p>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 space-y-2.5 border-b" style={{ borderColor: "var(--c-border)" }}>
                {/* Full backup (recommended) */}
                <button onClick={handleFull} disabled={isRunning}
                  className="w-full flex items-center gap-3 p-3 rounded-xl transition-all group disabled:opacity-50 relative overflow-hidden"
                  style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(6,182,212,0.1))", border: "1px solid rgba(124,58,237,0.3)" }}>
                  {running === "full"
                    ? <MdRefresh size={18} className="text-violet-400 animate-spin" />
                    : <MdBackup size={18} className="text-violet-400" />}
                  <div className="flex-1 text-left">
                    <p className="text-[var(--c-text)] text-sm font-bold">Full Backup</p>
                    <p className="text-[var(--c-muted)] text-xs">Download ZIP + push to GitHub</p>
                  </div>
                  <span className="text-[9px] font-bold text-violet-400 uppercase tracking-wider bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full">Recommended</span>
                </button>

                {/* Individual buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={handleLocal} disabled={isRunning}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
                    {running === "local" ? <MdRefresh size={15} className="animate-spin text-emerald-400" /> : <MdDownload size={15} className="text-emerald-400" />}
                    Local ZIP
                  </button>
                  <button onClick={handleGithub} disabled={isRunning}
                    className="flex items-center gap-2 p-2.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                    style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}>
                    {running === "github" ? <MdRefresh size={15} className="animate-spin text-violet-400" /> : <SiGithub size={13} className="text-violet-400" />}
                    GitHub
                  </button>
                </div>
              </div>

              {/* Log */}
              {log.length > 0 && (
                <div className="p-4 max-h-36 overflow-y-auto space-y-1">
                  {log.map((l, i) => (
                    <p key={i} className={`text-xs font-mono ${l.startsWith("✅") ? "text-emerald-400" : l.startsWith("❌") ? "text-red-400" : l.startsWith("⚠️") ? "text-amber-400" : "text-[var(--c-muted)]"}`}>
                      {l}
                    </p>
                  ))}
                  {done && (
                    <p className="text-xs font-mono text-emerald-400 font-bold flex items-center gap-1.5 mt-2">
                      <MdCheck size={14} /> Backup complete!
                    </p>
                  )}
                </div>
              )}

              {/* Info */}
              <div className="px-4 pb-4 pt-2">
                <p className="text-[10px] text-[var(--c-muted)] flex items-center gap-1.5">
                  <MdSchedule size={11} />
                  Auto-backup due: <span className="text-[var(--c-text)] font-mono">{
                    status?.nextDue ? timeAgo(status.nextDue).replace("in ", "") : "now"
                  }</span>
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}