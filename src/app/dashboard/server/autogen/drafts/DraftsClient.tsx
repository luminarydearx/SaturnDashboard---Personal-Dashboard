"use client";
import ConfirmModal from "@/components/ui/ConfirmModal";

import { useState, useEffect, useCallback } from "react";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  MdCode, MdRefresh, MdDelete, MdSearch, MdDescription,
  MdAccessTime, MdPerson, MdFilterList, MdOpenInNew, MdClose,
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Draft {
  id:        string;
  type:      string;
  title:     string;
  content:   string;
  userId?:   string;
  createdAt: string;
  updatedAt: string;
}

const TYPE_COLORS: Record<string, string> = {
  "cv":            "rgba(124,58,237,.15)",
  "surat-lamaran": "rgba(59,130,246,.15)",
  "portofolio":    "rgba(20,184,166,.15)",
};
const TYPE_TEXT: Record<string, string> = {
  "cv":            "#a78bfa",
  "surat-lamaran": "#60a5fa",
  "portofolio":    "#2dd4bf",
};

function typeBadge(type: string) {
  const bg   = TYPE_COLORS[type] || "rgba(var(--c-accent-rgb),.12)";
  const text = TYPE_TEXT[type]   || "var(--c-accent)";
  return { bg, text };
}

interface Props { user: PublicUser }

export default function DraftsClient({ user: _user }: Props) {
  const [drafts,   setDrafts]   = useState<Draft[]>([]);
  const [showClearDrafts, setShowClearDrafts] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [filter,   setFilter]   = useState("all");
  const [selected, setSelected] = useState<Draft | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const { success, error: toastErr } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/autogen/drafts");
      const d = await r.json();
      if (d.success) setDrafts(d.drafts || []);
      else toastErr(d.error || "Gagal load drafts");
    } catch { toastErr("Koneksi gagal"); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  const deleteDraft = async (id: string) => {
    setDeleting(id);
    try {
      const r = await fetch("/api/autogen/drafts", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const d = await r.json();
      if (d.success) {
        setDrafts(prev => prev.filter(x => x.id !== id));
        if (selected?.id === id) setSelected(null);
        success("Draft dihapus");
      } else toastErr(d.error || "Gagal hapus");
    } catch { toastErr("Gagal hapus"); }
    finally { setDeleting(null); }
  };

  const clearAll = async () => {
    setDeleting("__all__");
    try {
      const r = await fetch("/api/autogen/drafts", {
        method: "DELETE", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: null }),
      });
      const d = await r.json();
      if (d.success) { setDrafts([]); setSelected(null); success("Semua draft dihapus"); }
      else toastErr(d.error || "Gagal");
    } catch { toastErr("Gagal"); }
    finally { setDeleting(null); }
  };

  const types = ["all", ...Array.from(new Set(drafts.map(d => d.type)))];

  const filtered = drafts.filter(d => {
    const q = search.toLowerCase();
    const matchQ = !q || d.title.toLowerCase().includes(q) || d.userId?.toLowerCase().includes(q) || d.type.toLowerCase().includes(q);
    const matchF = filter === "all" || d.type === filter;
    return matchQ && matchF;
  });

  const parseContent = (raw: string) => {
    try { return JSON.parse(raw); } catch { return raw; }
  };

  const fmtTime = (iso: string) => {
    try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId }); }
    catch { return iso; }
  };

  return (
    <>
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdDescription size={24} style={{ color: "var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">AutoGen Drafts</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
              Draft yang tersinkron dari pengguna AutoGen — {drafts.length} total
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl transition-colors"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
          </button>
          {drafts.length > 0 && (
            <button onClick={() => setShowClearDrafts(true)} disabled={deleting === "__all__"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171" }}>
              <MdDelete size={14} /> Hapus Semua
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
            <MdSearch size={16} style={{ color: "var(--c-muted)" }} />
          </div>
          <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder="Cari draft, user ID, tipe…"
            className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft: 36 }} />
        </div>
        {/* Type filter */}
        <div className="flex items-center gap-1 flex-wrap">
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
              style={{
                background: filter === t ? "rgba(var(--c-accent-rgb),.15)" : "var(--c-surface)",
                border: filter === t ? "1px solid rgba(var(--c-accent-rgb),.35)" : "1px solid var(--c-border)",
                color: filter === t ? "var(--c-accent)" : "var(--c-muted)",
              }}>
              <MdFilterList size={11} /> {t === "all" ? `Semua (${drafts.length})` : t}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className={`grid grid-cols-1 gap-5 items-start ${selected ? "lg:grid-cols-[1fr_380px]" : ""}`}>

        {/* Draft list */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-20" style={{ color: "var(--c-muted)" }}>
              <MdRefresh size={20} className="animate-spin" />
              <span className="text-sm">Memuat drafts…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <MdDescription size={40} className="opacity-20" style={{ color: "var(--c-text)" }} />
              <p className="text-sm" style={{ color: "var(--c-muted)" }}>
                {search || filter !== "all" ? "Tidak ada draft yang cocok" : "Belum ada draft yang tersinkron"}
              </p>
              {(!search && filter === "all") && (
                <p className="text-xs text-center max-w-xs" style={{ color: "var(--c-muted)", opacity: 0.6 }}>
                  Integrasikan DraftSync.js ke AutoGenerator-App agar draft user otomatis muncul di sini
                </p>
              )}
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: "var(--c-border)" }}>
              {filtered.map(draft => {
                const badge = typeBadge(draft.type);
                const isSelected = selected?.id === draft.id;
                return (
                  <motion.div key={draft.id} layout
                    onClick={() => setSelected(isSelected ? null : draft)}
                    className="flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors"
                    style={{ background: isSelected ? "rgba(var(--c-accent-rgb),.06)" : "transparent" }}>
                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                      style={{ background: badge.bg, border: "1px solid rgba(255,255,255,.06)" }}>
                      <MdCode size={15} style={{ color: badge.text }} />
                    </div>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold truncate text-[var(--c-text)]">{draft.title}</p>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md capitalize flex-shrink-0"
                          style={{ background: badge.bg, color: badge.text }}>
                          {draft.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: "var(--c-muted)" }}>
                        {draft.userId && (
                          <span className="flex items-center gap-1 truncate max-w-[120px]">
                            <MdPerson size={11} /> {draft.userId}
                          </span>
                        )}
                        <span className="flex items-center gap-1 flex-shrink-0">
                          <MdAccessTime size={11} /> {fmtTime(draft.updatedAt)}
                        </span>
                      </div>
                    </div>
                    {/* Delete */}
                    <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); deleteDraft(draft.id); }}
                      disabled={deleting === draft.id}
                      className="p-1.5 rounded-lg flex-shrink-0 transition-colors hover:bg-red-500/10"
                      style={{ color: "var(--c-muted)" }}>
                      <MdDelete size={14} className={deleting === draft.id ? "animate-pulse" : ""} />
                    </button>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        <AnimatePresence>
          {selected && (
            <motion.div key={selected.id}
              initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
              className="rounded-2xl overflow-hidden sticky top-24"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              {/* Panel header */}
              <div className="flex items-center justify-between px-4 py-3 border-b"
                style={{ borderColor: "var(--c-border)", background: "rgba(var(--c-accent-rgb),.04)" }}>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--c-muted)" }}>Detail Draft</p>
                  <p className="text-sm font-semibold text-[var(--c-text)] truncate max-w-[220px]">{selected.title}</p>
                </div>
                <button onClick={() => setSelected(null)} className="p-1.5 rounded-lg"
                  style={{ color: "var(--c-muted)" }}>
                  <MdClose size={16} />
                </button>
              </div>

              {/* Meta */}
              <div className="px-4 py-3 border-b flex flex-col gap-2" style={{ borderColor: "var(--c-border)" }}>
                {[
                  { label: "ID", val: selected.id },
                  { label: "Tipe", val: selected.type },
                  { label: "User", val: selected.userId || "—" },
                  { label: "Dibuat", val: fmtTime(selected.createdAt) },
                  { label: "Diupdate", val: fmtTime(selected.updatedAt) },
                ].map(row => (
                  <div key={row.label} className="flex items-start gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider w-16 flex-shrink-0 mt-0.5" style={{ color: "var(--c-muted)" }}>{row.label}</span>
                    <span className="text-xs font-mono text-[var(--c-text)] break-all">{row.val}</span>
                  </div>
                ))}
              </div>

              {/* Content preview */}
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Konten</p>
                <pre className="text-xs font-mono rounded-xl p-3 overflow-auto max-h-64 leading-relaxed"
                  style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-text)", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                  {typeof parseContent(selected.content) === "object"
                    ? JSON.stringify(parseContent(selected.content), null, 2)
                    : selected.content}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
    <ConfirmModal
      isOpen={showClearDrafts}
      title="Hapus Semua Draft?"
      message="Semua draft yang tersinkron akan dihapus permanen."
      type="danger"
      confirmText="Hapus Semua"
      cancelText="Batal"
      onConfirm={clearAll}
      onCancel={() => setShowClearDrafts(false)}
    />
    </>
  );
}
