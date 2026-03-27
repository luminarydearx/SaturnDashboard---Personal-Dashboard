"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  MdAssignment, MdAdd, MdDelete, MdEdit, MdRefresh,
  MdFlag, MdAccessTime, MdPerson, MdClose, MdPlayArrow, MdDone, MdRestore,
} from "react-icons/md";
import { format } from "date-fns";

interface Task {
  id: string; title: string; description: string;
  assignedTo: string; assignedBy: string;
  status: "todo"|"progress"|"done"; priority: "low"|"medium"|"high";
  deadline: string; createdAt: string; updatedAt: string; tags: string[];
}
interface UserBasic { id: string; username: string; displayName: string; role: string; }
const PRIORITY_COLOR: Record<string,string> = { low:"#22c55e", medium:"#f59e0b", high:"#ef4444" };
const PRIORITY_LABEL: Record<string,string> = { low:"Rendah", medium:"Sedang", high:"Tinggi" };
const isManager = (role: string) => ["owner","co-owner","admin"].includes(role);
interface Props { user: PublicUser }

export default function TasksClient({ user }: Props) {
  const [tasks,    setTasks]    = useState<Task[]>([]);
  const [users,    setUsers]    = useState<UserBasic[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [delTarget,setDelTarget]= useState<Task | null>(null);
  const [form, setForm] = useState({ title:"", description:"", assignedTo:"", priority:"medium" as "low"|"medium"|"high", deadline:"" });
  const [saving, setSaving] = useState(false);
  const { success, error: toastErr } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tr, ur] = await Promise.all([fetch("/api/tasks"), fetch("/api/users")]);
      const [td, ud] = await Promise.all([tr.json(), ur.json()]);
      if (td.success) setTasks(td.tasks || []);
      if (ud.success) setUsers((ud.data as UserBasic[]).filter((u: UserBasic) => ["developer","admin","co-owner","owner"].includes(u.role)));
    } catch { toastErr("Gagal memuat data"); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line
  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditTask(null);
    setForm({ title:"", description:"", assignedTo:"", priority:"medium", deadline:"" });
    setShowForm(true);
  };
  const openEdit = (t: Task) => {
    setEditTask(t);
    setForm({ title:t.title, description:t.description, assignedTo:t.assignedTo, priority:t.priority, deadline:t.deadline ? t.deadline.split("T")[0] : "" });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.title.trim()) { toastErr("Judul task diperlukan"); return; }
    if (isManager(user.role) && !form.assignedTo) { toastErr("Pilih developer"); return; }
    setSaving(true);
    try {
      const method = editTask ? "PATCH" : "POST";
      const body   = editTask ? { id: editTask.id, ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : "" } : { ...form, deadline: form.deadline ? new Date(form.deadline).toISOString() : "" };
      const r = await fetch("/api/tasks", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (d.success) { success(editTask ? "Task diperbarui!" : "Task dibuat!"); setShowForm(false); await load(); }
      else toastErr(d.error || "Gagal");
    } finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: Task["status"]) => {
    const r = await fetch("/api/tasks", { method:"PATCH", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id, status }) });
    const d = await r.json();
    if (d.success) setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    else toastErr(d.error || "Gagal");
  };

  const doDelete = async () => {
    if (!delTarget) return;
    const r = await fetch("/api/tasks", { method:"DELETE", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ id: delTarget.id }) });
    const d = await r.json();
    if (d.success) { success("Task dihapus"); setTasks(prev => prev.filter(t => t.id !== delTarget.id)); }
    else toastErr(d.error || "Gagal");
    setDelTarget(null);
  };

  const getUserName = (id: string) => users.find(u => u.id === id)?.displayName || "Unknown";
  const isOverdue = (t: Task) => !!(t.deadline && t.status !== "done" && new Date(t.deadline) < new Date());

  const columns: { key: "todo"|"progress"|"done"; label: string; color: string }[] = [
    { key:"todo",     label:"To Do",       color:"#94a3b8" },
    { key:"progress", label:"In Progress", color:"#f59e0b" },
    { key:"done",     label:"Done",        color:"#22c55e" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background:"linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border:"1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdAssignment size={24} style={{ color:"var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Work Assignment</h1>
            <p className="text-xs mt-0.5" style={{ color:"var(--c-muted)" }}>
              {tasks.length} task · {tasks.filter(t=>t.status==="progress").length} in progress · {tasks.filter(t=>t.status==="done").length} selesai
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 rounded-xl" style={{ background:"var(--c-surface)", border:"1px solid var(--c-border)", color:"var(--c-muted)" }}>
            <MdRefresh size={16} className={loading ? "animate-spin":""} />
          </button>
          {isManager(user.role) && (
            <button onClick={openCreate} className="btn-primary flex items-center gap-2">
              <MdAdd size={16} /> Buat Task
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20" style={{ color:"var(--c-muted)" }}>
          <MdRefresh size={24} className="animate-spin mr-3" /> Memuat tasks…
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            return (
              <div key={col.key} className="rounded-2xl flex flex-col" style={{ background:"var(--c-surface)", border:"1px solid var(--c-border)", minHeight:300 }}>
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor:"var(--c-border)", background:"rgba(0,0,0,.06)" }}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background:col.color }} />
                    <span className="text-sm font-bold text-[var(--c-text)]">{col.label}</span>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background:`${col.color}18`, color:col.color }}>{colTasks.length}</span>
                </div>
                <div className="flex flex-col gap-2 p-3 flex-1">
                  {colTasks.length === 0 && <p className="text-xs text-center py-8" style={{ color:"var(--c-muted)", opacity:.5 }}>Tidak ada task</p>}
                  {colTasks.map(task => (
                    <motion.div key={task.id} layout initial={{ opacity:0, y:6 }} animate={{ opacity:1, y:0 }}
                      className="rounded-xl p-3 flex flex-col gap-2 group"
                      style={{ background:"var(--c-bg)", border: isOverdue(task) ? "1px solid rgba(239,68,68,.4)" : "1px solid var(--c-border)" }}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold text-[var(--c-text)] flex-1 leading-snug">{task.title}</p>
                        {isManager(user.role) && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => openEdit(task)} className="p-1 rounded-lg" style={{ color:"var(--c-muted)" }}><MdEdit size={13} /></button>
                            <button onClick={() => setDelTarget(task)} className="p-1 rounded-lg hover:text-red-400" style={{ color:"var(--c-muted)" }}><MdDelete size={13} /></button>
                          </div>
                        )}
                      </div>
                      {task.description && <p className="text-[11px] line-clamp-2" style={{ color:"var(--c-muted)" }}>{task.description}</p>}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md" style={{ background:`${PRIORITY_COLOR[task.priority]}18`, color:PRIORITY_COLOR[task.priority] }}>● {PRIORITY_LABEL[task.priority]}</span>
                        {task.deadline && (
                          <span className="text-[10px] flex items-center gap-0.5" style={{ color: isOverdue(task) ? "#f87171":"var(--c-muted)" }}>
                            <MdAccessTime size={10} /> {format(new Date(task.deadline), "dd MMM")}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px]" style={{ color:"var(--c-muted)" }}>
                          <MdPerson size={10} className="inline mr-0.5" />{getUserName(task.assignedTo)}
                        </span>
                        <div className="flex gap-1">
                          {task.status !== "progress" && <button onClick={() => updateStatus(task.id,"progress")} title="In Progress" className="p-1 rounded-md" style={{ color:"#f59e0b", background:"rgba(245,158,11,.1)" }}><MdPlayArrow size={13} /></button>}
                          {task.status !== "done" && <button onClick={() => updateStatus(task.id,"done")} title="Done" className="p-1 rounded-md" style={{ color:"#22c55e", background:"rgba(34,197,94,.1)" }}><MdDone size={13} /></button>}
                          {task.status !== "todo" && <button onClick={() => updateStatus(task.id,"todo")} title="Undo" className="p-1 rounded-md" style={{ color:"#94a3b8", background:"rgba(148,163,184,.1)" }}><MdRestore size={13} /></button>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000] flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
            <motion.div initial={{ opacity:0, scale:.9, y:20 }} animate={{ opacity:1, scale:1, y:0 }} exit={{ opacity:0, scale:.9 }}
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
              style={{ background:"var(--c-surface)", border:"1px solid var(--c-border)" }}>
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor:"var(--c-border)", background:"rgba(var(--c-accent-rgb),.04)" }}>
                <p className="font-bold text-[var(--c-text)]">{editTask ? "Edit Task" : "Buat Task Baru"}</p>
                <button onClick={() => setShowForm(false)} style={{ color:"var(--c-muted)" }}><MdClose size={18} /></button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:"var(--c-muted)" }}>Judul *</label>
                  <input value={form.title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({...f, title:e.target.value}))} className="saturn-input w-full focus:outline-none" placeholder="Judul task..." />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:"var(--c-muted)" }}>Deskripsi</label>
                  <textarea value={form.description} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm(f => ({...f, description:e.target.value}))} rows={3} className="saturn-input w-full resize-none focus:outline-none text-sm" placeholder="Detail task..." />
                </div>
                {isManager(user.role) && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:"var(--c-muted)" }}>Assign Ke *</label>
                      <select value={form.assignedTo} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({...f, assignedTo:e.target.value}))} className="saturn-input w-full focus:outline-none">
                        <option value="">Pilih user...</option>
                        {users.map(u => <option key={u.id} value={u.id}>{u.displayName} ({u.role})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:"var(--c-muted)" }}>Prioritas</label>
                      <select value={form.priority} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setForm(f => ({...f, priority:e.target.value as any}))} className="saturn-input w-full focus:outline-none">
                        <option value="low">Rendah</option>
                        <option value="medium">Sedang</option>
                        <option value="high">Tinggi</option>
                      </select>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5" style={{ color:"var(--c-muted)" }}>Deadline</label>
                  <input type="date" value={form.deadline} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setForm(f => ({...f, deadline:e.target.value}))} className="saturn-input w-full focus:outline-none" />
                </div>
                <button onClick={save} disabled={saving} className="btn-primary flex items-center justify-center gap-2">
                  {saving ? "Menyimpan…" : editTask ? "Simpan" : "Buat Task"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal isOpen={!!delTarget} title={`Hapus "${delTarget?.title}"?`} message="Task akan dihapus permanen." type="danger" confirmText="Hapus" cancelText="Batal" onConfirm={doDelete} onCancel={() => setDelTarget(null)} />
    </div>
  );
}
