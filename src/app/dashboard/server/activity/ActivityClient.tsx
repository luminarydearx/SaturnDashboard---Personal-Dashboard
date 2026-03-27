"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  MdHistory, MdRefresh, MdDelete, MdSearch, MdFilterList,
  MdLogin, MdLock, MdCampaign, MdNotes, MdPeople, MdSettings,
  MdBackup, MdComputer, MdCheckCircle, MdError, MdClose,
} from "react-icons/md";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow, format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type Category = "all" | "auth" | "lockdown" | "announce" | "note" | "user" | "backup" | "settings" | "system";

interface Log {
  id:        string;
  timestamp: string;
  category:  string;
  action:    string;
  actor:     string;
  actorRole?: string;
  target?:   string;
  detail?:   string;
  success:   boolean;
}

const CAT_ICON: Record<string, React.ElementType> = {
  auth:     MdLogin,    lockdown: MdLock,     announce: MdCampaign,
  note:     MdNotes,    user:     MdPeople,   backup:   MdBackup,
  settings: MdSettings, system:   MdComputer, default:  MdHistory,
};

const CAT_COLOR: Record<string, string> = {
  auth:     "#60a5fa", lockdown: "#f87171",  announce: "#fbbf24",
  note:     "#a78bfa", user:     "#34d399",  backup:   "#f59e0b",
  settings: "#94a3b8", system:   "#c084fc",  default:  "var(--c-muted)",
};

const CAT_LABELS: Record<string, string> = {
  auth: "Auth", lockdown: "Lockdown", announce: "Announce",
  note: "Notes", user: "Users", backup: "Backup",
  settings: "Settings", system: "System",
};

const ACTION_LABELS: Record<string, string> = {
  AUTH_LOGIN:         "Login berhasil",
  AUTH_LOGIN_FAIL:    "Login gagal",
  AUTH_LOGOUT:        "Logout",
  LOCKDOWN_LOCK:      "Website di-lockdown",
  LOCKDOWN_UNLOCK:    "Lockdown dicabut",
  ANNOUNCE_SET:       "Announcement dipublish",
  ANNOUNCE_CLEAR:     "Announcement dihapus",
  NOTE_CREATE:        "Note dibuat",
  NOTE_EDIT:          "Note diedit",
  NOTE_DELETE:        "Note dihapus",
  USER_CREATE:        "User dibuat",
  USER_UPDATE:        "User diupdate",
  USER_DELETE:        "User dihapus",
  USER_BAN:           "User dibanned",
  USER_UNBAN:         "User di-unban",
  USER_PROMOTE:       "User dipromote",
  USER_DEMOTE:        "User didemote",
  BACKUP_CREATE:      "Backup dibuat",
  BACKUP_RESTORE:     "Backup direstore",
  SYSTEM_RESTART:     "Server di-restart",
};

const ROLE_COLOR: Record<string, string> = {
  owner: "text-purple-400", "co-owner": "text-violet-400",
  admin: "text-blue-400",   developer: "text-cyan-400",
  user:  "text-gray-400",
};

interface Props { user: PublicUser }

export default function ActivityClient({ user }: Props) {
  const [logs,    setLogs]    = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [cat,     setCat]     = useState<Category>("all");
  const [detail,  setDetail]  = useState<Log | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { success, error: toastErr } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = cat !== "all" ? `?category=${cat}` : "";
      const r = await fetch(`/api/activity${q}`);
      const d = await r.json();
      if (d.success) setLogs(d.logs || []);
      else toastErr(d.error || "Gagal load logs");
    } catch { toastErr("Koneksi gagal"); }
    finally { setLoading(false); }
  }, [cat]); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const doClearAll = async () => {
    setShowClearConfirm(false);
    const r = await fetch("/api/activity", { method: "DELETE" });
    const d = await r.json();
    if (d.success) { setLogs([]); success("Logs dihapus"); }
    else toastErr(d.error || "Gagal");
  };

  const filtered = logs.filter(l => {
    const q = search.toLowerCase();
    return !q || l.actor.toLowerCase().includes(q) || l.action.toLowerCase().includes(q)
      || (l.target||"").toLowerCase().includes(q) || (l.detail||"").toLowerCase().includes(q);
  });

  const categories: Category[] = ["all","auth","lockdown","announce","note","user","backup","settings","system"];

  const fmtTime = (iso: string) => {
    try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId }); }
    catch { return iso; }
  };
  const fmtFull = (iso: string) => {
    try { return format(new Date(iso), "dd MMM yyyy HH:mm:ss"); }
    catch { return iso; }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdHistory size={24} style={{ color: "var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Activity Logs</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
              {logs.length} entri tersimpan — login, lockdown, announce, notes, user management
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {user.role === "owner" && logs.length > 0 && (
            <button onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171" }}>
              <MdDelete size={14} /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <MdSearch size={16} style={{ color: "var(--c-muted)" }} />
          </div>
          <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Cari actor, aksi, target…"
            className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft: 36 }} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {categories.map(c => {
            const Icon = CAT_ICON[c] || MdFilterList;
            return (
              <button key={c} onClick={() => setCat(c)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={{
                  background: cat === c ? "rgba(var(--c-accent-rgb),.15)" : "var(--c-surface)",
                  border: cat === c ? "1px solid rgba(var(--c-accent-rgb),.35)" : "1px solid var(--c-border)",
                  color: cat === c ? "var(--c-accent)" : "var(--c-muted)",
                }}>
                <Icon size={11} /> {c === "all" ? "Semua" : CAT_LABELS[c] || c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Log list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16" style={{ color: "var(--c-muted)" }}>
            <MdRefresh size={20} className="animate-spin" />
            <span className="text-sm">Memuat logs…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <MdHistory size={40} className="opacity-20" style={{ color: "var(--c-text)" }} />
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>
              {search ? "Tidak ada log yang cocok" : "Belum ada activity logs"}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
            {filtered.map(log => {
              const Icon  = CAT_ICON[log.category] || MdHistory;
              const color = CAT_COLOR[log.category] || CAT_COLOR.default;
              return (
                <motion.div key={log.id} layout
                  onClick={() => setDetail(log)}
                  className="flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-[var(--c-surface2)]">
                  {/* Icon */}
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: `${color}18`, border: `1px solid ${color}30` }}>
                    <Icon size={15} style={{ color }} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="text-sm font-semibold text-[var(--c-text)]">
                        {ACTION_LABELS[log.action] || log.action}
                      </span>
                      {log.target && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md font-mono"
                          style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
                          {log.target}
                        </span>
                      )}
                      {log.success
                        ? <MdCheckCircle size={13} className="text-emerald-400 flex-shrink-0" />
                        : <MdError size={13} className="text-red-400 flex-shrink-0" />}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] flex-wrap" style={{ color: "var(--c-muted)" }}>
                      <span className={`font-semibold ${ROLE_COLOR[log.actorRole || ""] || ""}`}>
                        @{log.actor}
                      </span>
                      {log.detail && (
                        <span className="truncate max-w-[200px] opacity-70">"{log.detail}"</span>
                      )}
                      <span className="flex-shrink-0 opacity-60">{fmtTime(log.timestamp)}</span>
                    </div>
                  </div>

                  {/* Time compact */}
                  <span className="text-[10px] flex-shrink-0 mt-0.5 hidden sm:block font-mono"
                    style={{ color: "var(--c-muted)" }}>
                    {format(new Date(log.timestamp), "HH:mm")}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail modal */}
      <AnimatePresence>
        {detail && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4"
            onClick={() => setDetail(null)}>
            <motion.div initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b"
                style={{ borderColor: "var(--c-border)", background: "rgba(var(--c-accent-rgb),.04)" }}>
                <p className="font-bold text-[var(--c-text)]">Detail Log</p>
                <button onClick={() => setDetail(null)} className="p-1 rounded-lg" style={{ color: "var(--c-muted)" }}>
                  <MdClose size={16} />
                </button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                {[
                  ["ID",        detail.id],
                  ["Waktu",     fmtFull(detail.timestamp)],
                  ["Kategori",  CAT_LABELS[detail.category] || detail.category],
                  ["Aksi",      ACTION_LABELS[detail.action] || detail.action],
                  ["Actor",     `@${detail.actor}${detail.actorRole ? ` (${detail.actorRole})` : ""}`],
                  ["Target",    detail.target || "—"],
                  ["Detail",    detail.detail || "—"],
                  ["Status",    detail.success ? "✅ Berhasil" : "❌ Gagal"],
                ].map(([label, val]) => (
                  <div key={label} className="flex gap-3">
                    <span className="text-xs font-bold uppercase tracking-wider w-20 flex-shrink-0 pt-0.5"
                      style={{ color: "var(--c-muted)" }}>{label}</span>
                    <span className="text-sm text-[var(--c-text)] break-all">{val}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    <ConfirmModal
        isOpen={showClearConfirm}
        title="Hapus Semua Activity Logs?"
        message="Semua riwayat aktivitas akan dihapus permanen. Tindakan ini tidak bisa dibatalkan."
        type="danger"
        confirmText="Hapus Semua"
        cancelText="Batal"
        onConfirm={doClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
