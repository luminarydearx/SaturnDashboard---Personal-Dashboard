"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { PublicUser, Note } from "@/types";
import NoteCard from "@/components/notes/NoteCard";
import NoteForm from "@/components/notes/NoteForm";
import ConfirmModal from "@/components/ui/ConfirmModal";
import SavingOverlay from "@/components/ui/SavingOverlay";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { roleBadgeClass } from "@/lib/auth.utils";
import {
  MdAdd, MdSearch, MdNotes, MdClose, MdEdit, MdDelete, MdTag,
  MdImage, MdCalendarToday, MdVisibilityOff, MdCheckCircle, MdHistory,
  MdExpandMore,
} from "react-icons/md";
import { formatDistanceToNow, format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

// ── session-persisted state helper ──────────────────────────────────────
function useSessionState<T>(key: string, def: T): [T, (v: T) => void] {
  const [val, setVal] = useState<T>(() => {
    if (typeof window === "undefined") return def;
    try { const s = sessionStorage.getItem(key); return s ? JSON.parse(s) : def; }
    catch { return def; }
  });
  const set = (v: T) => {
    setVal(v);
    try { sessionStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  return [val, set];
}

const NOTE_ACCENT: Record<string, string> = {
  violet: "from-violet-600/20 to-violet-600/5 border-violet-500/30",
  cyan:   "from-cyan-600/20 to-cyan-600/5 border-cyan-500/30",
  pink:   "from-pink-600/20 to-pink-600/5 border-pink-500/30",
  amber:  "from-amber-600/20 to-amber-600/5 border-amber-500/30",
  teal:   "from-teal-600/20 to-teal-600/5 border-teal-500/30",
  blue:   "from-blue-600/20 to-blue-600/5 border-blue-500/30",
};
const NOTE_DOT: Record<string, string> = {
  violet: "bg-violet-500", cyan: "bg-cyan-500", pink: "bg-pink-500",
  amber:  "bg-amber-500",  teal: "bg-teal-500", blue: "bg-blue-500",
};

// ── Recent notes with monthly grouping ───────────────────────────────────
const RECENT_LS = "saturn_recent_notes";
interface RecentNote { id: string; title: string; color: string; doneAt: string; }

function getRecentNotes(): RecentNote[] {
  try {
    const data = JSON.parse(localStorage.getItem(RECENT_LS) || "[]") as RecentNote[];
    const cutoff = new Date(); cutoff.setFullYear(cutoff.getFullYear() - 1);
    return data.filter(n => new Date(n.doneAt) > cutoff);
  } catch { return []; }
}
function addRecentNote(note: RecentNote): void {
  try {
    const list = getRecentNotes().filter(n => n.id !== note.id);
    list.unshift(note);
    localStorage.setItem(RECENT_LS, JSON.stringify(list.slice(0, 500)));
  } catch {}
}

function groupByMonth(notes: RecentNote[]): Record<string, RecentNote[]> {
  const map: Record<string, RecentNote[]> = {};
  for (const n of notes) {
    const key = format(new Date(n.doneAt), "MMMM yyyy");
    if (!map[key]) map[key] = [];
    map[key].push(n);
  }
  return map;
}

// ── Full Preview modal ────────────────────────────────────────────────────
function NotePreview({ note, currentUser, onClose, onEdit, onDelete }: {
  note: Note; currentUser: PublicUser;
  onClose: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const isOwner  = currentUser.role === "owner" || currentUser.role === "co-owner";
  const isAdmin  = currentUser.role === "admin";
  const isAuthor = note.authorId === currentUser.id;
  const canEdit  = isAuthor;
  const canDelete = isOwner || (isAdmin && note.authorRole === "user") || isAuthor;
  const accent = NOTE_ACCENT[note.color] || NOTE_ACCENT.violet;
  const dot    = NOTE_DOT[note.color]   || NOTE_DOT.violet;

  return (
    <Modal open onClose={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0, y: 30 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }} transition={{ type: "spring", stiffness: 280, damping: 22 }}
        className={`w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col bg-gradient-to-br ${accent} border`}
        style={{ background: "var(--dropdown-bg)", maxHeight: "90dvh" }}>
        <div className="flex items-start gap-3 p-5 pb-3 border-b" style={{ borderColor: "var(--c-border)" }}>
          <span className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${dot}`} />
          <div className="flex-1 min-w-0">
            <h2 className="font-orbitron font-bold text-[var(--c-text)] text-lg leading-tight">{note.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[var(--c-muted)] text-xs font-mono">@{note.authorName}</span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize ${roleBadgeClass(note.authorRole)}`}>{note.authorRole}</span>
              {note.hidden && <span className="text-[10px] bg-slate-700/50 text-slate-400 px-2 py-0.5 rounded-full flex items-center gap-1"><MdVisibilityOff size={9} /> HIDDEN</span>}
              {note.done  && <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">✓ DONE</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-[var(--c-muted)] text-xs">
              <span className="flex items-center gap-1"><MdCalendarToday size={11} /> {format(new Date(note.createdAt), "MMM d, yyyy · HH:mm")}</span>
              {note.updatedAt !== note.createdAt && <span className="opacity-60">· edited {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {canEdit   && <button onClick={onEdit}   className="p-2 rounded-xl text-[var(--c-muted)] hover:text-violet-400 hover:bg-violet-500/10 transition-colors"><MdEdit size={18} /></button>}
            {canDelete && <button onClick={onDelete} className="p-2 rounded-xl text-[var(--c-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"><MdDelete size={18} /></button>}
            <button onClick={onClose} className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)] transition-colors"><MdClose size={20} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-5">
          {note.content && <p className="text-[var(--c-text)] text-base leading-relaxed whitespace-pre-wrap font-nunito">{note.content}</p>}
          {note.images.length > 0 && (
            <div className="mt-5 space-y-3">
              <p className="text-[var(--c-muted)] text-xs font-bold uppercase tracking-wider flex items-center gap-2"><MdImage size={13} /> {note.images.length} Image{note.images.length > 1 ? "s" : ""}</p>
              <div className={`grid gap-3 ${note.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
                {note.images.map((img, i) => (
                  <a key={i} href={img} target="_blank" rel="noopener noreferrer"
                    className="relative rounded-2xl overflow-hidden block group" style={{ aspectRatio: note.images.length === 1 ? "16/8" : "4/3" }}>
                    <Image src={img} alt={`Image ${i + 1}`} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="600px" />
                  </a>
                ))}
              </div>
            </div>
          )}
          {note.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {note.tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 text-xs bg-white/5 text-[var(--c-muted)] px-3 py-1 rounded-full border border-white/5"><MdTag size={11} /> {tag}</span>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </Modal>
  );
}

// ── Recent notes panel ────────────────────────────────────────────────────
function RecentPanel({ onClose }: { onClose: () => void }) {
  const [recentNotes, setRecentNotes] = useState<RecentNote[]>([]);
  const [openMonths, setOpenMonths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const notes = getRecentNotes();
    setRecentNotes(notes);
    // Open the first (latest) month by default
    const groups = groupByMonth(notes);
    const keys = Object.keys(groups);
    if (keys[0]) setOpenMonths({ [keys[0]]: true });
  }, []);

  const grouped: Record<string, typeof recentNotes> = groupByMonth(recentNotes);
  const months  = Object.keys(grouped);

  return (
    <Modal open onClose={onClose}>
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-xl rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)", maxHeight: "80dvh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b flex-shrink-0" style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
          <MdHistory size={18} className="text-emerald-400" />
          <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)] flex-1">Recent Done Notes</h3>
          <span className="text-xs text-[var(--c-muted)]">{recentNotes.length} total · clears after 1 year</span>
          <button onClick={onClose} className="text-[var(--c-muted)] hover:text-[var(--c-text)] p-1"><MdClose size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {months.length === 0 ? (
            <div className="py-16 text-center">
              <MdHistory size={40} className="text-[var(--c-muted)] opacity-20 mx-auto mb-3" />
              <p className="text-[var(--c-muted)] text-sm">No recent done notes yet</p>
              <p className="text-[var(--c-muted)] text-xs mt-1">Notes marked as done appear here</p>
            </div>
          ) : months.map(month => (
            <div key={month} className="border-b last:border-0" style={{ borderColor: "var(--c-border)" }}>
              <button
                onClick={() => setOpenMonths(p => ({ ...p, [month]: !p[month] }))}
                className="w-full flex items-center justify-between px-5 py-3 hover:bg-[var(--c-surface)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <MdCalendarToday size={13} className="text-violet-400" />
                  <span className="text-[var(--c-text)] text-sm font-semibold">{month}</span>
                  <span className="text-[var(--c-muted)] text-xs bg-[var(--c-surface)] px-1.5 py-0.5 rounded-full">{grouped[month].length}</span>
                </div>
                <MdExpandMore size={16} className={`text-[var(--c-muted)] transition-transform ${openMonths[month] ? "" : "-rotate-90"}`} />
              </button>

              <AnimatePresence>
                {openMonths[month] && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    {grouped[month].map(n => (
                      <div key={n.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[var(--c-surface)] transition-colors">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${NOTE_DOT[n.color] || "bg-violet-500"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--c-text)] text-sm font-medium truncate">{n.title}</p>
                          <p className="text-[var(--c-muted)] text-[10px] font-mono mt-0.5">
                            Done: {format(new Date(n.doneAt), "dd MMM yyyy · HH:mm")}
                          </p>
                        </div>
                        <MdCheckCircle size={14} className="text-emerald-400 flex-shrink-0" />
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>
    </Modal>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function NotesClient({ user, highlightId }: { user: PublicUser; highlightId?: string }) {
  const [notes,        setNotes]        = useState<Note[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editNote,     setEditNote]     = useState<Note | null>(null);
  const [previewNote,  setPreviewNote]  = useState<Note | null>(null);
  const [submitting,   setSubmitting]   = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deletingId,   setDeletingId]   = useState<string | null>(null);
  const [showRecent,   setShowRecent]   = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(highlightId ?? null);

  // Session-persisted search/filter
  const [search,      setSearch]      = useSessionState("notes_search", "");
  const [filterColor, setFilterColor] = useSessionState("notes_filter_color", "all");

  const { success, error: toastError } = useToast();

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch("/api/notes");
      const d   = await res.json();
      if (d.success) setNotes(d.data);
    } catch { toastError("Failed to load notes"); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  useEffect(() => {
    if (!highlightedId || loading) return;
    const t = setTimeout(() => {
      const el = document.getElementById(`note-card-${highlightedId}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTimeout(() => setHighlightedId(null), 3500);
      }
    }, 600);
    return () => clearTimeout(t);
  }, [highlightedId, loading]);

  const handleCreate = async (fd: { title: string; content: string; images: string[]; tags: string[]; color: string }) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fd) });
      const d   = await res.json();
      if (d.success) { success("Note created ✓"); setShowForm(false); await fetchNotes(); }
      else toastError(d.error);
    } finally { setSubmitting(false); }
  };

  const handleUpdate = async (fd: { title: string; content: string; images: string[]; tags: string[]; color: string }) => {
    if (!editNote) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/notes/${editNote.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(fd) });
      const d   = await res.json();
      if (d.success) { success("Note updated ✓"); setEditNote(null); await fetchNotes(); }
      else toastError(d.error);
    } finally { setSubmitting(false); }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeletingId(deleteTarget);
    try {
      const res = await fetch(`/api/notes/${deleteTarget}`, { method: "DELETE" });
      const d   = await res.json();
      if (d.success) { success("Note deleted ✓"); setNotes((p: typeof notes) => p.filter(n => n.id !== deleteTarget)); }
      else toastError(d.error || "Failed");
    } catch { toastError("Error"); }
    finally { setDeleteTarget(null); setDeletingId(null); }
  };

  const handleToggleHide = async (note: Note) => {
    const res = await fetch(`/api/notes/${note.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ hidden: !note.hidden }) });
    const d   = await res.json();
    if (d.success) { success(note.hidden ? "Note visible" : "Note hidden"); await fetchNotes(); }
    else toastError(d.error);
  };

  const handleTogglePin = async (note: Note) => {
    const res = await fetch(`/api/notes/${note.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pinned: !note.pinned }) });
    const d   = await res.json();
    if (d.success) { success(note.pinned ? "Unpinned" : "📌 Pinned"); await fetchNotes(); }
    else toastError(d.error);
  };

  const handleToggleDone = async (note: Note) => {
    const nowDone = !note.done;
    const res = await fetch(`/api/notes/${note.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ done: nowDone }) });
    const d   = await res.json();
    if (d.success) {
      if (nowDone) {
        addRecentNote({ id: note.id, title: note.title, color: note.color, doneAt: new Date().toISOString() });
        success("✓ Marked as done! Will auto-delete in 24h");
      } else {
        success("Marked as undone");
      }
      await fetchNotes();
    } else toastError(d.error);
  };

  const COLORS  = ["all", "violet", "cyan", "pink", "amber", "teal", "blue"];
  const filtered = notes.filter(n => {
    const ms = n.title.toLowerCase().includes(search.toLowerCase()) ||
               n.content.toLowerCase().includes(search.toLowerCase()) ||
               n.authorName.toLowerCase().includes(search.toLowerCase());
    return ms && (filterColor === "all" || n.color === filterColor);
  });
  const sorted = [...filtered].sort((a, b) => {
    if (a.done && !b.done) return 1;
    if (!a.done && b.done) return -1;
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <SavingOverlay visible={submitting || !!deletingId}
        message={submitting ? (editNote ? "Updating…" : "Creating…") : "Deleting…"}
        submessage="Saving & syncing to GitHub…" />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">All Notes</h1>
          <p className="text-[var(--c-muted)] text-sm mt-1">{filtered.length} notes</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowRecent(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-[var(--c-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors border border-[var(--c-border)]"
            style={{ background: "var(--c-surface)" }}>
            <MdHistory size={16} /> Recent
          </button>
          <button onClick={() => setShowForm(true)} className="btn-primary"><MdAdd size={20} /> New Note</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <div className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center pointer-events-none z-10">
            <MdSearch className="text-[var(--c-muted)] group-focus-within:text-violet-400 transition-colors" size={18} />
          </div>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search notes…" autoComplete="off" name="saturn_notes__search"
            className="saturn-input w-full pr-4 focus:outline-none" style={{ paddingLeft: "44px" }} />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          {COLORS.map(c => (
            <button key={c} onClick={() => setFilterColor(c)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all
                ${filterColor === c ? "bg-violet-600/30 text-violet-300 border border-violet-500/30" : "text-[var(--c-muted)] hover:text-[var(--c-text)] border border-[var(--c-border)]"}`}
              style={{ background: filterColor === c ? undefined : "var(--c-surface)" }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass rounded-2xl p-5 animate-pulse">
              <div className="h-4 rounded mb-3 w-3/4" style={{ background: "var(--c-border)" }} />
              <div className="h-3 rounded mb-2" style={{ background: "var(--c-border)" }} />
            </div>
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <button onClick={() => !search && setShowForm(true)}
          className={`w-full glass rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center py-20 gap-5 group
            ${!search ? "border-violet-500/20 hover:border-violet-500/50 cursor-pointer" : "border-[var(--c-border)] cursor-default"}`}>
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-cyan-600/20 border border-violet-500/20 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
            <MdNotes size={32} className="text-violet-400/60 group-hover:text-violet-400 transition-colors" />
          </div>
          <div className="text-center">
            <p className="text-[var(--c-text)] font-semibold font-nunito text-lg">{search ? "No notes match" : "No notes yet"}</p>
            {!search && <p className="text-[var(--c-muted)] text-sm mt-1 font-nunito">Click to create your first note ✨</p>}
          </div>
        </button>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sorted.map(note => (
            <div key={note.id} id={`note-card-${note.id}`}
              className={`rounded-2xl transition-all duration-700 ${highlightedId === note.id ? "ring-2 ring-violet-500 ring-offset-2 shadow-[0_0_28px_rgba(139,92,246,0.5)]" : ""}`}>
              <NoteCard note={note} currentUser={user}
                onEdit={() => setEditNote(note)}
                onDelete={() => setDeleteTarget(note.id)}
                onToggleHide={() => handleToggleHide(note)}
                onTogglePin={() => handleTogglePin(note)}
                onToggleDone={() => handleToggleDone(note)}
                onPreview={() => setPreviewNote(note)} />
            </div>
          ))}
        </div>
      )}

      {showForm && <NoteForm authorName={user.username} onSubmit={handleCreate} onClose={() => setShowForm(false)} submitting={submitting} />}
      {editNote && <NoteForm initialData={editNote} authorName={user.username} onSubmit={handleUpdate} onClose={() => setEditNote(null)} submitting={submitting} />}
      {previewNote && (
        <NotePreview note={previewNote} currentUser={user}
          onClose={() => setPreviewNote(null)}
          onEdit={() => { setEditNote(previewNote); setPreviewNote(null); }}
          onDelete={() => { setDeleteTarget(previewNote.id); setPreviewNote(null); }} />
      )}
      {showRecent && <RecentPanel onClose={() => setShowRecent(false)} />}

      <ConfirmModal isOpen={deleteTarget !== null} title="Delete Note?" message="This action cannot be undone."
        type="danger" confirmText="Delete Note" cancelText="Keep"
        onConfirm={confirmDelete} onCancel={() => setDeleteTarget(null)} isLoading={deletingId !== null} />
    </div>
  );
}
