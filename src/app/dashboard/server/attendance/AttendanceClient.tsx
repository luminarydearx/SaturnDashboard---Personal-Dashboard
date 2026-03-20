"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  MdQrCode2, MdRefresh, MdDelete, MdSearch, MdPerson,
  MdAccessTime, MdVerified, MdFilterList,
} from "react-icons/md";
import Image from "next/image";
import { motion } from "framer-motion";
import { format, formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface AttRec {
  id: string; userId: string; username: string;
  displayName: string; role: string; avatar?: string;
  scannedAt: string; ip?: string;
}

const ROLE_COLOR: Record<string, string> = {
  owner: "text-purple-400", "co-owner": "text-violet-400",
  admin: "text-blue-400",   developer: "text-cyan-400",  user: "text-slate-400",
};
const ROLE_BG: Record<string, string> = {
  owner: "rgba(168,85,247,.15)", "co-owner": "rgba(139,92,246,.15)",
  admin: "rgba(59,130,246,.15)", developer: "rgba(6,182,212,.15)", user: "rgba(100,116,139,.15)",
};

interface Props { user: PublicUser }

export default function AttendanceClient({ user }: Props) {
  const [records, setRecords] = useState<AttRec[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState("");
  const [filter,  setFilter]  = useState("all");
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const { success, error: toastErr } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/attendance");
      const d = await r.json();
      if (d.success) setRecords(d.records);
      else toastErr(d.error);
    } catch { toastErr("Gagal load"); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const doClearAll = async () => {
    setShowClearConfirm(false);
    const r = await fetch("/api/attendance", { method: "DELETE" });
    const d = await r.json();
    if (d.success) { setRecords([]); success("Data absensi dihapus"); }
    else toastErr(d.error);
  };

  const roles = ["all", ...Array.from(new Set(records.map(r => r.role)))];

  const filtered = records.filter((r: AttRec) => {
    const q = search.toLowerCase();
    const matchQ = !q || r.username.toLowerCase().includes(q) || r.displayName.toLowerCase().includes(q);
    const matchF = filter === "all" || r.role === filter;
    return matchQ && matchF;
  });

  const fmtTime = (iso: string) => { try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId }); } catch { return iso; } };
  const fmtFull = (iso: string) => { try { return format(new Date(iso), "dd MMM yyyy • HH:mm:ss"); } catch { return iso; } };

  // Stats
  const today = new Date().toDateString();
  const todayCount   = records.filter(r => new Date(r.scannedAt).toDateString() === today).length;
  const uniqueUsers  = new Set(records.map((r: AttRec) => r.userId)).size;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdQrCode2 size={24} style={{ color: "var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Attendance</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
              Log absensi via QR Code — hanya owner & co-owner
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {user.role === "owner" && records.length > 0 && (
            <button onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171" }}>
              <MdDelete size={14} /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Total Scan",    val: records.length,  color: "var(--c-accent)" },
          { label: "Scan Hari Ini", val: todayCount,       color: "#22c55e"         },
          { label: "Pengguna Unik", val: uniqueUsers,      color: "#f59e0b"         },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <p className="text-2xl font-bold font-orbitron" style={{ color: s.color }}>{s.val}</p>
            <p className="text-[11px] uppercase tracking-wider mt-1" style={{ color: "var(--c-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <MdSearch size={16} style={{ color: "var(--c-muted)" }} />
          </div>
          <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Cari nama, username…" className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft: 36 }} />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          {roles.map(r => (
            <button key={r} onClick={() => setFilter(r)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                background: filter === r ? "rgba(var(--c-accent-rgb),.15)" : "var(--c-surface)",
                border: filter === r ? "1px solid rgba(var(--c-accent-rgb),.35)" : "1px solid var(--c-border)",
                color: filter === r ? "var(--c-accent)" : "var(--c-muted)",
              }}>
              <MdFilterList size={11} /> {r === "all" ? `Semua (${records.length})` : r}
            </button>
          ))}
        </div>
      </div>

      {/* Records list */}
      <div className="rounded-2xl overflow-hidden" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16" style={{ color: "var(--c-muted)" }}>
            <MdRefresh size={20} className="animate-spin" />
            <span className="text-sm">Memuat data absensi…</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <MdQrCode2 size={40} className="opacity-20" style={{ color: "var(--c-text)" }} />
            <p className="text-sm" style={{ color: "var(--c-muted)" }}>
              {search ? "Tidak ada yang cocok" : "Belum ada absensi via QR Code"}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
            {filtered.map((rec: AttRec, i: number) => (
              <motion.div key={rec.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                className="flex items-center gap-4 px-5 py-3.5">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0"
                  style={{ background: ROLE_BG[rec.role] || "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                  {rec.avatar ? (
                    <Image src={rec.avatar} alt={rec.displayName} width={40} height={40} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-sm"
                      style={{ color: "var(--c-accent)" }}>
                      {(rec.displayName || rec.username)[0].toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-[var(--c-text)]">{rec.displayName}</span>
                    <span className={`text-[10px] font-bold uppercase ${ROLE_COLOR[rec.role] || ""}`}>{rec.role}</span>
                    <MdVerified size={12} className="text-violet-400" title="Login via QR" />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] flex-wrap" style={{ color: "var(--c-muted)" }}>
                    <span className="flex items-center gap-1"><MdPerson size={11} /> @{rec.username}</span>
                    <span className="flex items-center gap-1"><MdAccessTime size={11} /> {fmtTime(rec.scannedAt)}</span>
                    {rec.ip && <span className="font-mono opacity-60">{rec.ip}</span>}
                  </div>
                </div>

                {/* Time */}
                <span className="text-[10px] text-right flex-shrink-0 hidden sm:block font-mono"
                  style={{ color: "var(--c-muted)" }}>
                  {fmtFull(rec.scannedAt)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    <ConfirmModal
        isOpen={showClearConfirm}
        title="Hapus Semua Data Absensi?"
        message="Semua record absensi akan dihapus permanen."
        type="danger"
        confirmText="Hapus Semua"
        cancelText="Batal"
        onConfirm={doClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />
    </div>
  );
}
