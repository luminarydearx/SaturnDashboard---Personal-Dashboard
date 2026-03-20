"use client";

import { useState, useEffect } from "react";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  MdAlarm, MdAdd, MdDelete, MdCheckCircle, MdRadioButtonUnchecked,
  MdClose, MdFlag, MdAccessTime,
} from "react-icons/md";
import { motion, AnimatePresence } from "framer-motion";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface Reminder {
  id: string; title: string; body?: string; dueAt: string;
  done: boolean; priority: "low"|"medium"|"high"; owner: string; createdAt: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  low: "#22c55e", medium: "#f59e0b", high: "#ef4444",
};
const PRIORITY_LABELS: Record<string, string> = {
  low: "Rendah", medium: "Sedang", high: "Tinggi",
};

function dueBadge(dueAt: string, done: boolean): { text: string; color: string } {
  if (done) return { text: "Selesai ✓", color: "#22c55e" };
  const d = new Date(dueAt);
  if (isPast(d))     return { text: "Terlambat!", color: "#ef4444" };
  if (isToday(d))    return { text: "Hari ini", color: "#f59e0b" };
  if (isTomorrow(d)) return { text: "Besok", color: "#60a5fa" };
  try { return { text: format(d, "dd MMM", { locale: localeId }), color: "var(--c-muted)" }; }
  catch { return { text: dueAt, color: "var(--c-muted)" }; }
}

interface Props { user: PublicUser }

export default function RemindersClient({ user: _user }: Props) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [showForm,  setShowForm]  = useState(false);
  const [adding,    setAdding]    = useState(false);
  const [form, setForm] = useState<{ title: string; body: string; dueAt: string; priority: "low"|"medium"|"high" }>({ title: "", body: "", dueAt: "", priority: "medium" });

  const { success, error: toastErr } = useToast();

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/reminders");
      const d = await r.json();
      if (d.success) setReminders(d.reminders);
    } catch { toastErr("Gagal load"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line

  const add = async () => {
    if (!form.title.trim() || !form.dueAt) return;
    setAdding(true);
    try {
      const r = await fetch("/api/reminders", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dueAt: new Date(form.dueAt).toISOString() }),
      });
      const d = await r.json();
      if (d.success) {
        setReminders(prev => [d.reminder, ...prev].sort((a, b) => {
          if (a.done !== b.done) return a.done ? 1 : -1;
          return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
        }));
        setForm({ title: "", body: "", dueAt: "", priority: "medium" as const });
        setShowForm(false); success("⏰ Reminder ditambahkan!");
      } else toastErr(d.error);
    } catch { toastErr("Gagal"); }
    finally { setAdding(false); }
  };

  const toggle = async (id: string, done: boolean) => {
    await fetch("/api/reminders", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, done: !done }),
    });
    setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !done } : r)
      .sort((a, b) => { if (a.done !== b.done) return a.done ? 1 : -1; return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime(); }));
  };

  const remove = async (id: string) => {
    await fetch("/api/reminders", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const pending  = reminders.filter(r => !r.done);
  const done     = reminders.filter(r => r.done);
  const overdue  = pending.filter(r => isPast(new Date(r.dueAt)));

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdAlarm size={24} style={{ color: "var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Reminders</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
              {pending.length} aktif{overdue.length > 0 ? ` · ${overdue.length} terlambat` : ""}
            </p>
          </div>
        </div>
        <button onClick={() => setShowForm(f => !f)} className="btn-primary flex items-center gap-2">
          <MdAdd size={16} /> Tambah
        </button>
      </div>

      {/* Overdue warning */}
      {overdue.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)" }}>
          <MdFlag size={16} className="text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400 font-semibold">{overdue.length} reminder sudah terlambat!</p>
        </div>
      )}

      {/* Add Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-5 flex flex-col gap-4"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-[var(--c-text)]">Reminder Baru</p>
              <button onClick={() => setShowForm(false)} style={{ color: "var(--c-muted)" }}><MdClose size={18} /></button>
            </div>
            <input value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Judul reminder…" className="saturn-input w-full focus:outline-none" />
            <textarea value={form.body} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({ ...f, body: e.target.value }))}
              placeholder="Keterangan (opsional)…" rows={2} className="saturn-input w-full resize-none focus:outline-none text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)" }}>
                  Tanggal & Waktu
                </label>
                <input type="datetime-local" value={form.dueAt}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({ ...f, dueAt: e.target.value }))}
                  className="saturn-input w-full focus:outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)" }}>
                  Prioritas
                </label>
                <div className="flex gap-2">
                  {(["low","medium","high"] as const).map(p => (
                    <button key={p} onClick={() => setForm(f => ({ ...f, priority: p }))}
                      className="flex-1 py-2 rounded-lg text-xs font-bold transition-all capitalize"
                      style={{ background: form.priority === p ? `${PRIORITY_COLOR[p]}22` : "var(--c-bg)", border: form.priority === p ? `1px solid ${PRIORITY_COLOR[p]}` : "1px solid var(--c-border)", color: form.priority === p ? PRIORITY_COLOR[p] : "var(--c-muted)" }}>
                      {PRIORITY_LABELS[p]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={add} disabled={!form.title.trim() || !form.dueAt || adding} className="btn-primary flex items-center gap-2">
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

      {/* Reminder list */}
      {loading ? (
        <div className="flex items-center justify-center py-16" style={{ color: "var(--c-muted)" }}>
          <div className="w-6 h-6 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="flex flex-col items-center py-16 gap-3" style={{ color: "var(--c-muted)" }}>
          <MdAlarm size={40} className="opacity-20" />
          <p className="text-sm">Belum ada reminder — klik Tambah</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {[...pending, ...done].map(r => {
            const badge = dueBadge(r.dueAt, r.done);
            return (
              <motion.div key={r.id} layout
                className="flex items-start gap-3 px-4 py-3.5 rounded-2xl transition-all"
                style={{
                  background: r.done ? "rgba(0,0,0,.05)" : "var(--c-surface)",
                  border: "1px solid var(--c-border)",
                  opacity: r.done ? 0.55 : 1,
                }}>
                <button onClick={() => toggle(r.id, r.done)} className="mt-0.5 flex-shrink-0 transition-colors"
                  style={{ color: r.done ? "#22c55e" : "var(--c-muted)" }}>
                  {r.done ? <MdCheckCircle size={20} /> : <MdRadioButtonUnchecked size={20} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold ${r.done ? "line-through" : ""} text-[var(--c-text)]`}>{r.title}</p>
                  {r.body && <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>{r.body}</p>}
                  <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: badge.color }}>
                      <MdAccessTime size={11} /> {badge.text}
                    </span>
                    <span className="text-[11px] font-bold" style={{ color: PRIORITY_COLOR[r.priority] }}>
                      ● {PRIORITY_LABELS[r.priority]}
                    </span>
                    {!r.done && (
                      <span className="text-[10px]" style={{ color: "var(--c-muted)" }}>
                        {format(new Date(r.dueAt), "HH:mm, dd MMM yyyy")}
                      </span>
                    )}
                  </div>
                </div>
                <button onClick={() => remove(r.id)} className="p-1.5 rounded-lg flex-shrink-0 transition-colors hover:text-red-400"
                  style={{ color: "var(--c-muted)" }}>
                  <MdDelete size={15} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
