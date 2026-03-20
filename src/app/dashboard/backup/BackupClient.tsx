"use client";
import ConfirmModal from "@/components/ui/ConfirmModal";

import { useState, useCallback, useRef } from "react";
import { PublicUser, BackupEntry } from "@/types";
import { useToast } from "@/components/ui/Toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  MdBackup, MdDownload, MdDelete, MdEdit, MdCheck, MdClose,
  MdAdd, MdRefresh, MdSchedule, MdCloud, MdComputer, MdUpload,
} from "react-icons/md";
import { SiGithub } from "react-icons/si";
import { format, formatDistanceToNow } from "date-fns";
import { downloadLocalBackup, pushGithubBackup } from "@/lib/autoBackup";

const TYPE_ICON: Record<string, React.ElementType> = {
  local: MdComputer, github: SiGithub, manual: MdUpload,
};
const TYPE_CLR: Record<string, string> = {
  local: "text-emerald-400", github: "text-violet-400", manual: "text-cyan-400",
};

interface Props {
  user: PublicUser;
  initialBackups: BackupEntry[];
}

const CAN_MANAGE = ["owner", "co-owner"];

export default function BackupClient({ user, initialBackups }: Props) {
  const [backups,  setBackups]  = useState<BackupEntry[]>(initialBackups);
  const [running,  setRunning]  = useState<"local" | "github" | "">("");
  const [editId,   setEditId]   = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [log,      setLog]      = useState<string[]>([]);
  const [deleteConfirmId,   setDeleteConfirmId]   = useState<string | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const { success, error: toastError } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const canManage = CAN_MANAGE.includes(user.role);

  const addLog = (msg: string) => setLog((p: string[]) => [...p.slice(-19), `[${new Date().toLocaleTimeString("id-ID")}] ${msg}`]);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/backups");
    const d = await res.json();
    if (d.success) setBackups(d.data);
  }, []);

  const handleLocal = async () => {
    setRunning("local"); addLog("📦 Starting local ZIP download…");
    try {
      await downloadLocalBackup();
      addLog("✅ ZIP downloaded to your device");
      success("Backup downloaded!");
      await refresh();
    } catch (e: any) {
      addLog(`❌ ${e.message}`);
      toastError("Download failed");
    }
    setRunning("");
  };

  const handleGithub = async () => {
    setRunning("github"); addLog("☁️ Pushing to GitHub…");
    const r = await pushGithubBackup();
    if (r.success) {
      addLog("✅ Backup pushed to GitHub repo");
      success("Pushed to GitHub!");
      await refresh();
    } else {
      addLog(`❌ GitHub: ${r.error}`);
      toastError(r.error || "Push failed");
    }
    setRunning("");
  };

  const handleDelete = (id: string, name: string) => {
    setDeleteConfirmId(id);
    setDeleteConfirmName(name);
  };

  const doDelete = async () => {
    const id   = deleteConfirmId;
    const name = deleteConfirmName;
    setDeleteConfirmId(null);
    if (!id) return;
    const res = await fetch("/api/backups", { method: "DELETE", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id }) });
    const d = await res.json();
    if (d.success) { setBackups((p: typeof initialBackups) => p.filter(b => b.id !== id)); success("Deleted"); addLog(`🗑️ Deleted "${name}"`); }
    else toastError("Delete failed");
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    const res = await fetch("/api/backups", { method: "PUT", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ id, name: editName.trim() }) });
    const d = await res.json();
    if (d.success) {
      setBackups((p: typeof initialBackups) => p.map((b: (typeof initialBackups)[0]) => b.id === id ? { ...b, name: editName.trim() } : b));
      setEditId(null); success("Renamed");
    } else toastError("Rename failed");
  };

  const handleDownloadEntry = (entry: BackupEntry) => {
    // Trigger a fresh backup download with the entry name
    const a = document.createElement("a");
    a.href = "/api/backup";
    a.download = entry.name;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    addLog(`⬇️ Downloaded "${entry.name}"`);
  };

  const handleManualUpload = async (e: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    if (!file) return;
    const res = await fetch("/api/backups", {
      method: "POST", headers: {"Content-Type":"application/json"},
      body: JSON.stringify({ name: file.name, size: file.size }),
    });
    const d = await res.json();
    if (d.success) { setBackups((p: typeof initialBackups) => [d.data, ...p]); success("Entry added"); addLog(`📋 Manual entry: "${file.name}"`); }
    else toastError("Failed to add");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Backup Manager</h1>
        <p className="text-[var(--c-muted)] text-sm mt-1">Manage, download, and push data backups</p>
      </div>

      {/* Action cards */}
      {canManage && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleLocal} disabled={!!running}
            className="glass border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-emerald-500/30 transition-all disabled:opacity-50 text-left">
            {running === "local" ? <MdRefresh size={28} className="text-emerald-400 animate-spin flex-shrink-0" />
              : <MdDownload size={28} className="text-emerald-400 flex-shrink-0" />}
            <div>
              <p className="font-bold text-[var(--c-text)]">Download Local ZIP</p>
              <p className="text-[var(--c-muted)] text-xs mt-0.5">Save backup ZIP to your laptop now</p>
            </div>
          </motion.button>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={handleGithub} disabled={!!running}
            className="glass border border-white/10 rounded-2xl p-5 flex items-center gap-4 hover:border-violet-500/30 transition-all disabled:opacity-50 text-left">
            {running === "github" ? <MdRefresh size={28} className="text-violet-400 animate-spin flex-shrink-0" />
              : <SiGithub size={26} className="text-violet-400 flex-shrink-0" />}
            <div>
              <p className="font-bold text-[var(--c-text)]">Push to GitHub</p>
              <p className="text-[var(--c-muted)] text-xs mt-0.5">Upload backup ZIP to your repo</p>
            </div>
          </motion.button>
        </div>
      )}

      {/* Backup list */}
      <div className="glass border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "var(--c-border)" }}>
          <div className="flex items-center gap-2">
            <MdBackup size={18} className="text-violet-400" />
            <h2 className="font-semibold text-[var(--c-text)]">Backup History</h2>
            <span className="text-xs text-[var(--c-muted)] bg-[var(--c-surface)] px-2 py-0.5 rounded-full">{backups.length}</span>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={handleManualUpload} />
                <button onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors"
                  style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                  <MdAdd size={14} /> Add Manual
                </button>
              </>
            )}
            <button onClick={refresh} className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)] transition-colors">
              <MdRefresh size={16} />
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <div className="py-16 text-center">
            <MdBackup size={40} className="text-[var(--c-muted)] opacity-20 mx-auto mb-3" />
            <p className="text-[var(--c-muted)] text-sm">No backups yet</p>
            {canManage && <p className="text-[var(--c-muted)] text-xs mt-1">Download or push your first backup above</p>}
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
            {backups.map(entry => {
              const Icon = TYPE_ICON[entry.type] || MdBackup;
              const clr  = TYPE_CLR[entry.type] || "text-slate-400";
              const isEditing = editId === entry.id;
              return (
                <div key={entry.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--c-surface)] transition-colors">
                  <Icon size={18} className={`flex-shrink-0 ${clr}`} />
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleRename(entry.id); if (e.key === "Escape") setEditId(null); }}
                          className="flex-1 saturn-input text-sm py-1 px-2"
                          autoFocus
                        />
                        <button onClick={() => handleRename(entry.id)} className="text-emerald-400 hover:text-emerald-300 p-1"><MdCheck size={16} /></button>
                        <button onClick={() => setEditId(null)} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1"><MdClose size={16} /></button>
                      </div>
                    ) : (
                      <>
                        <p className="text-[var(--c-text)] text-sm font-semibold truncate">{entry.name}</p>
                        <p className="text-[var(--c-muted)] text-xs flex items-center gap-1.5 mt-0.5">
                          <MdSchedule size={11} />
                          {format(new Date(entry.createdAt), "dd MMM yyyy HH:mm")}
                          <span className="opacity-40">·</span>
                          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
                          {entry.size && <><span className="opacity-40">·</span> {(entry.size/1024).toFixed(1)}KB</>}
                          <span className="opacity-40">·</span>
                          <span className="capitalize">{entry.createdBy}</span>
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => handleDownloadEntry(entry)}
                      className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      title="Download">
                      <MdDownload size={15} />
                    </button>
                    {canManage && (
                      <>
                        <button onClick={() => { setEditId(entry.id); setEditName(entry.name); }}
                          className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          title="Rename">
                          <MdEdit size={15} />
                        </button>
                        <button onClick={() => handleDelete(entry.id, entry.name)}
                          className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Delete">
                          <MdDelete size={15} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity log */}
      {log.length > 0 && (
        <div className="glass border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--c-muted)]">Activity Log</p>
            <button onClick={() => setLog([])} className="text-[var(--c-muted)] text-xs hover:text-[var(--c-text)] transition-colors">Clear</button>
          </div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {log.map((l, i) => (
              <p key={i} className={`text-xs font-mono ${
                l.includes("✅") ? "text-emerald-400" : l.includes("❌") ? "text-red-400" : "text-[var(--c-muted)]"
              }`}>{l}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}