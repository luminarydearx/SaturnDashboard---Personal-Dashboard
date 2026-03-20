"use client";

import { useState, useEffect } from "react";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  MdContentPaste, MdAdd, MdDelete, MdContentCopy, MdPushPin,
  MdLink, MdCode, MdTextFields, MdSearch, MdCheckCircle, MdClose,
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface ClipItem {
  id: string; content: string; label?: string; type: "text"|"link"|"code";
  author: string; createdAt: string; pinned: boolean;
}

const TYPE_ICON: Record<string, React.ElementType> = {
  text: MdTextFields, link: MdLink, code: MdCode,
};
const TYPE_COLOR: Record<string, string> = {
  text: "var(--c-accent)", link: "#22c55e", code: "#f59e0b",
};

interface Props { user: PublicUser }

export default function ClipboardClient({ user }: Props) {
  const [clips,    setClips]    = useState<ClipItem[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [content,  setContent]  = useState("");
  const [label,    setLabel]    = useState("");
  const [type,     setType]     = useState<"text"|"link"|"code">("text");
  const [adding,   setAdding]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [search,   setSearch]   = useState("");
  const [copied,   setCopied]   = useState<string|null>(null);

  const { success, error: toastErr } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/clipboard");
      const d = await r.json();
      if (d.success) setClips(d.clips);
    } catch { toastErr("Gagal load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async () => {
    if (!content.trim()) return;
    setAdding(true);
    try {
      const r = await fetch("/api/clipboard", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, label, type }),
      });
      const d = await r.json();
      if (d.success) {
        setClips(prev => [d.item, ...prev]);
        setContent(""); setLabel(""); setType("text"); setShowForm(false);
        success("📋 Ditambahkan!");
      } else toastErr(d.error);
    } catch { toastErr("Gagal"); }
    finally { setAdding(false); }
  };

  const remove = async (id: string) => {
    await fetch("/api/clipboard", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setClips(prev => prev.filter(c => c.id !== id));
  };

  const pin = async (id: string, pinned: boolean) => {
    await fetch("/api/clipboard", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, pinned: !pinned }) });
    setClips(prev => prev.map(c => c.id === id ? { ...c, pinned: !pinned } : c));
  };

  const copy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id); setTimeout(() => setCopied(null), 2000);
      success("📋 Disalin!");
    });
  };

  const filtered = clips
    .filter(c => !search || c.content.toLowerCase().includes(search.toLowerCase()) || (c.label||"").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const fmtTime = (iso: string) => { try { return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: localeId }); } catch { return iso; } };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdContentPaste size={24} style={{ color: "var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Team Clipboard</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
              Clipboard bersama untuk tim — teks, link, code snippet
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(f => !f)}
          className="btn-primary flex items-center gap-2">
          <MdAdd size={16} /> Tambah
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--c-text)]">Tambah Clip Baru</p>
              <button onClick={() => setShowForm(false)} style={{ color: "var(--c-muted)" }}><MdClose size={18} /></button>
            </div>
            {/* Type selector */}
            <div className="flex gap-2">
              {(["text","link","code"] as const).map(t => {
                const Icon = TYPE_ICON[t];
                return (
                  <button key={t} onClick={() => setType(t)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{ background: type === t ? "rgba(var(--c-accent-rgb),.15)" : "var(--c-bg)", border: type === t ? "1px solid rgba(var(--c-accent-rgb),.35)" : "1px solid var(--c-border)", color: type === t ? "var(--c-accent)" : "var(--c-muted)" }}>
                    <Icon size={12} /> {t}
                  </button>
                );
              })}
            </div>
            <input value={label} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabel(e.target.value)}
              placeholder="Label (opsional)" className="saturn-input w-full focus:outline-none text-sm" />
            <textarea value={content} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
              placeholder={type === "code" ? "// Paste kode di sini…" : type === "link" ? "https://…" : "Teks atau catatan…"}
              rows={4} className="saturn-input w-full resize-none focus:outline-none text-sm font-mono" />
            <div className="flex gap-3">
              <button onClick={add} disabled={!content.trim() || adding} className="btn-primary flex items-center gap-2">
                {adding ? "Menyimpan…" : <><MdAdd size={14} /> Simpan</>}
              </button>
              <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm"
                style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
                Batal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div className="relative">
        <div className="absolute left-3 inset-y-0 flex items-center pointer-events-none">
          <MdSearch size={16} style={{ color: "var(--c-muted)" }} />
        </div>
        <input value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          placeholder="Cari clip…" className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft: 36 }} />
      </div>

      {/* Clips grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "var(--c-muted)" }}>
          <div className="w-6 h-6 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3" style={{ color: "var(--c-muted)" }}>
          <MdContentPaste size={40} className="opacity-20" />
          <p className="text-sm">{search ? "Tidak ditemukan" : "Belum ada clip — klik Tambah"}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(clip => {
            const TypeIcon = TYPE_ICON[clip.type];
            const color    = TYPE_COLOR[clip.type];
            return (
              <motion.div key={clip.id} layout
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "var(--c-surface)", border: clip.pinned ? `1px solid rgba(var(--c-accent-rgb),.35)` : "1px solid var(--c-border)" }}>
                {/* Card header */}
                <div className="flex items-center gap-2 px-4 py-2.5 border-b"
                  style={{ borderColor: "var(--c-border)", background: "rgba(0,0,0,.08)" }}>
                  <TypeIcon size={13} style={{ color }} />
                  <span className="text-xs font-semibold text-[var(--c-text)] flex-1 truncate">
                    {clip.label || clip.content.slice(0, 40)}
                  </span>
                  {clip.pinned && <MdPushPin size={11} style={{ color: "var(--c-accent)" }} />}
                  <span className="text-[10px]" style={{ color: "var(--c-muted)" }}>@{clip.author}</span>
                </div>
                {/* Content */}
                <pre className="px-4 py-3 text-xs font-mono text-[var(--c-text)] flex-1 overflow-auto max-h-32 whitespace-pre-wrap break-all leading-relaxed"
                  style={{ background: "transparent" }}>
                  {clip.content}
                </pre>
                {/* Footer */}
                <div className="flex items-center gap-1 px-3 py-2 border-t"
                  style={{ borderColor: "var(--c-border)", background: "rgba(0,0,0,.06)" }}>
                  <span className="text-[10px] flex-1" style={{ color: "var(--c-muted)" }}>{fmtTime(clip.createdAt)}</span>
                  <button onClick={() => copy(clip.id, clip.content)} title="Salin"
                    className="p-1.5 rounded-lg transition-colors" style={{ color: copied === clip.id ? "#4ade80" : "var(--c-muted)" }}>
                    {copied === clip.id ? <MdCheckCircle size={14} /> : <MdContentCopy size={14} />}
                  </button>
                  <button onClick={() => pin(clip.id, clip.pinned)} title={clip.pinned ? "Unpin" : "Pin"}
                    className="p-1.5 rounded-lg transition-colors"
                    style={{ color: clip.pinned ? "var(--c-accent)" : "var(--c-muted)" }}>
                    <MdPushPin size={14} />
                  </button>
                  {(user.role === "owner" || user.username === clip.author) && (
                    <button onClick={() => remove(clip.id)} title="Hapus"
                      className="p-1.5 rounded-lg transition-colors hover:text-red-400"
                      style={{ color: "var(--c-muted)" }}>
                      <MdDelete size={14} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
