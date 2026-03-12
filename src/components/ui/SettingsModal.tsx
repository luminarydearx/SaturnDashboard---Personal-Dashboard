'use client';

import {
  useState, useEffect, useRef, useCallback,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { PublicUser, Note } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { useTheme, ACCENT_PRESETS } from '@/components/ui/ThemeContext';
import GithubPushModal from '@/components/ui/GithubPushModal';
import { SiGithub, SiCloudinary } from 'react-icons/si';
import {
  MdClose, MdCloudUpload, MdInfo, MdSettings, MdKeyboard,
  MdCheckCircle, MdEdit, MdCheck, MdRefresh, MdPerson,
  MdBookmark, MdAdd, MdSearch, MdDelete, MdPalette,
  MdDarkMode, MdLightMode, MdSettingsBrightness, MdCode,
  MdContentCopy, MdNotes,
} from 'react-icons/md';
import { format } from 'date-fns';
import {
  ShortcutMap, loadShortcuts, saveShortcuts,
  DEFAULT_SHORTCUTS, SHORTCUT_LABELS, eventToShortcut, displayShortcut,
} from '@/lib/shortcuts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface SettingsData { githubOwner: string; githubRepo: string; lastPush: string }
interface Props { open: boolean; onClose: () => void; user: PublicUser }
type Tab = 'profile' | 'notes' | 'theme' | 'artifact' | 'settings' | 'shortcuts';
interface Snippet {
  id: string; title: string; code: string;
  lang: string; color: string; tags: string[]; createdAt: string;
}

// ── InfoBox ───────────────────────────────────────────────────────────────────
function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
      <p className="text-[10px] uppercase tracking-wider font-semibold mb-1.5" style={{ color: 'var(--c-muted)' }}>{label}</p>
      <p className="font-mono text-sm text-[var(--c-text)] truncate">{value || '—'}</p>
    </div>
  );
}

// ── PROFILE TAB ───────────────────────────────────────────────────────────────
function ProfileTab({ user }: { user: PublicUser }) {
  const [form, setForm] = useState({
    displayName: user.displayName || '',
    firstName:   user.firstName   || '',
    lastName:    user.lastName    || '',
    email:       user.email       || '',
    phone:       user.phone       || '',
    bio:         user.bio         || '',
  });
  const [saving,    setSaving]    = useState(false);
  const [avatar,    setAvatar]    = useState(user.avatar || '');
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error: toastErr } = useToast();

  const CLOUD_NAME    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || 'dg3awuzug';
  const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  const handleAvatarUpload = async (file: File) => {
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('upload_preset', UPLOAD_PRESET);
      const res  = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.secure_url) throw new Error('Upload gagal');
      setAvatar(data.secure_url);
      success('Avatar diupload!');
    } catch (e: any) { toastErr(e.message); } finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, avatar }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal');
      success('Profil berhasil diperbarui!');
    } catch (e: any) { toastErr(e.message); } finally { setSaving(false); }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-4">
        <div className="relative cursor-pointer flex-shrink-0" onClick={() => fileRef.current?.click()}>
          {avatar ? (
            <Image src={avatar} alt="avatar" width={72} height={72}
              className="rounded-2xl object-cover" style={{ width: 72, height: 72, border: '2px solid var(--c-accent)' }} />
          ) : (
            <div className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center text-2xl font-orbitron font-bold"
              style={{ background: 'linear-gradient(135deg,var(--c-accent),var(--c-accent2))', color: '#fff' }}>
              {(user.displayName || user.username)?.[0]?.toUpperCase()}
            </div>
          )}
          {uploading && (
            <div className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center">
              <MdRefresh size={20} className="animate-spin text-white" />
            </div>
          )}
        </div>
        <div>
          <p className="font-semibold text-[var(--c-text)]">{user.displayName || user.username}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--c-muted)' }}>@{user.username} · <span className="capitalize">{user.role}</span></p>
          <button onClick={() => fileRef.current?.click()}
            className="mt-2 text-xs font-semibold px-3 py-1 rounded-lg"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', color: 'var(--c-accent)' }}>
            Ganti Avatar
          </button>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarUpload(f); }} />

      <div className="grid grid-cols-2 gap-3">
        {([
          ['Display Name', 'displayName'], ['Email', 'email'],
          ['First Name', 'firstName'],     ['Last Name', 'lastName'],
          ['Phone', 'phone'],
        ] as [string, keyof typeof form][]).map(([label, key]) => (
          <div key={key}>
            <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--c-muted)' }}>{label}</label>
            <input value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              className="saturn-input w-full text-sm" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs font-semibold mb-1" style={{ color: 'var(--c-muted)' }}>Bio</label>
        <textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
          rows={3} className="saturn-input w-full text-sm resize-none" />
      </div>
      <button onClick={handleSave} disabled={saving}
        className="btn-primary flex items-center gap-2 justify-center">
        {saving ? <><MdRefresh size={15} className="animate-spin" /> Saving…</> : <><MdCheck size={15} /> Simpan Profil</>}
      </button>
    </div>
  );
}

// ── NOTES TAB ─────────────────────────────────────────────────────────────────
function NotesTab({ user }: { user: PublicUser }) {
  const [notes,   setNotes]   = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [title,   setTitle]   = useState('');
  const [content, setContent] = useState('');
  const [saving,  setSaving]  = useState(false);
  const { success, error: toastErr } = useToast();

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/notes');
      const data = await res.json();
      if (data.success) setNotes((data.data as Note[]).filter(n => n.authorId === user.id && !n.hidden));
    } catch {} finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { fetchNotes(); }, [fetchNotes]);

  const createNote = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/notes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, color: '#7c3aed', tags: [], images: [] }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || 'Gagal');
      success('Note dibuat!');
      setTitle(''); setContent(''); setAddOpen(false);
      fetchNotes();
    } catch (e: any) { toastErr(e.message); } finally { setSaving(false); }
  };

  const deleteNote = async (id: string) => {
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
      setNotes(n => n.filter(x => x.id !== id));
      success('Note dihapus');
    } catch (e: any) { toastErr(e.message); }
  };

  const filtered = notes.filter(n => n.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari note…" className="saturn-input w-full pl-8 text-sm" />
        </div>
        <button onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold text-sm text-white flex-shrink-0"
          style={{ background: 'var(--c-accent)' }}>
          <MdAdd size={15} /> Tambah
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Judul note…" className="saturn-input w-full text-sm" />
          <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Isi note…" rows={3} className="saturn-input w-full text-sm resize-none" />
          <div className="flex gap-2">
            <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>Batal</button>
            <button onClick={createNote} disabled={saving || !title.trim()}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--c-accent)', opacity: !title.trim() ? 0.5 : 1 }}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8"><MdRefresh size={20} className="animate-spin" style={{ color: 'var(--c-accent)' }} /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10">
          <MdNotes size={32} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--c-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--c-muted)' }}>Belum ada note</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
          {filtered.map(note => (
            <div key={note.id} className="rounded-xl px-4 py-3 flex items-start gap-3"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <MdBookmark size={13} className="flex-shrink-0 mt-1" style={{ color: note.color || 'var(--c-accent)' }} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[var(--c-text)] truncate">{note.title}</p>
                {note.content && <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--c-muted)' }}>{note.content}</p>}
                <p className="text-[10px] mt-1" style={{ color: 'var(--c-muted)' }}>{format(new Date(note.createdAt), 'MMM d, yyyy')}</p>
              </div>
              <button onClick={() => deleteNote(note.id)}
                className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ color: 'var(--c-muted)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-muted)')}>
                <MdDelete size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── THEME TAB ─────────────────────────────────────────────────────────────────
type ThemeMode = 'dark' | 'light' | 'auto';
const THEMES_LIST: { id: ThemeMode; label: string; icon: React.ElementType }[] = [
  { id: 'dark',  label: 'Dark',  icon: MdDarkMode           },
  { id: 'light', label: 'Light', icon: MdLightMode          },
  { id: 'auto',  label: 'Auto',  icon: MdSettingsBrightness },
];

function ThemeTab() {
  const { theme, setTheme, resolved, accentIndex, setAccentIndex, accent } = useTheme();
  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--c-muted)' }}>Color Mode</p>
        <div className="grid grid-cols-3 gap-3">
          {THEMES_LIST.map(({ id, label, icon: Icon }) => {
            const active = theme === id;
            return (
              <button key={id} onClick={() => setTheme(id)}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl transition-all"
                style={{
                  background: active ? 'linear-gradient(135deg,rgba(var(--c-accent-rgb),.15),rgba(var(--c-accent2-rgb),.08))' : 'var(--c-surface)',
                  border: active ? '2px solid rgba(var(--c-accent-rgb),.4)' : '2px solid var(--c-border)',
                }}>
                <Icon size={22} style={{ color: active ? 'var(--c-accent)' : 'var(--c-muted)' }} />
                <span className="text-sm font-bold" style={{ color: active ? 'var(--c-text)' : 'var(--c-muted)' }}>{label}</span>
                {active && <MdCheck size={13} style={{ color: 'var(--c-accent)' }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'var(--c-muted)' }}>Accent Color</p>
        <div className="grid grid-cols-2 gap-2">
          {ACCENT_PRESETS.map((preset, i) => {
            const isActive = accentIndex === i;
            return (
              <button key={preset.name} onClick={() => setAccentIndex(i)}
                className="flex items-center gap-3 p-3 rounded-xl transition-all"
                style={{
                  background: isActive ? `linear-gradient(135deg,${preset.from}22,${preset.to}11)` : 'var(--c-surface)',
                  border: isActive ? `2px solid ${preset.from}66` : '2px solid var(--c-border)',
                }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `linear-gradient(135deg,${preset.from},${preset.to})`, flexShrink: 0, boxShadow: isActive ? `0 4px 12px ${preset.from}55` : 'none' }} />
                <span className="text-sm font-bold" style={{ color: isActive ? 'var(--c-text)' : 'var(--c-muted)' }}>{preset.name}</span>
                {isActive && <MdCheck size={14} className="ml-auto flex-shrink-0" style={{ color: preset.from }} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 py-3 rounded-xl flex items-center gap-3"
        style={{ background: 'rgba(var(--c-accent-rgb),.08)', border: '1px solid rgba(var(--c-accent-rgb),.2)' }}>
        <MdPalette size={15} style={{ color: 'var(--c-accent)' }} />
        <p className="text-xs" style={{ color: 'var(--c-muted)' }}>
          Mode: <span style={{ color: 'var(--c-accent)' }} className="font-bold capitalize">{theme}</span>
          {' '}· Rendered: <span style={{ color: 'var(--c-accent2)' }} className="font-bold capitalize">{resolved}</span>
          {' '}· Accent: <span style={{ color: 'var(--c-accent)' }} className="font-bold">{accent.name}</span>
        </p>
      </div>
    </div>
  );
}

// ── ARTIFACT TAB — Code Snippets Manager ──────────────────────────────────────
const LANGS  = ['ts','tsx','js','jsx','html','css','python','bash','json','sql','other'];
const COLORS = ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777','#0891b2'];

function ArtifactTab() {
  const [snippets,  setSnippets]  = useState<Snippet[]>([]);
  const [addOpen,   setAddOpen]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Snippet,'id'|'createdAt'>>({ title: '', code: '', lang: 'ts', color: COLORS[0], tags: [] });
  const [tagInput,  setTagInput]  = useState('');
  const { success, error: toastErr } = useToast();

  useEffect(() => {
    try {
      const raw = localStorage.getItem('saturn_snippets');
      if (raw) setSnippets(JSON.parse(raw));
    } catch {}
  }, []);

  const persist = (list: Snippet[]) => {
    setSnippets(list);
    try { localStorage.setItem('saturn_snippets', JSON.stringify(list)); } catch {}
  };

  const addSnippet = () => {
    if (!form.title.trim() || !form.code.trim()) { toastErr('Judul dan kode wajib diisi'); return; }
    const s: Snippet = { ...form, id: Date.now().toString(), createdAt: new Date().toISOString() };
    persist([s, ...snippets]);
    setForm({ title: '', code: '', lang: 'ts', color: COLORS[0], tags: [] });
    setTagInput(''); setAddOpen(false);
    success('Snippet disimpan!');
  };

  const copyCode = async (code: string) => {
    try { await navigator.clipboard.writeText(code); success('Kode disalin!'); }
    catch { toastErr('Gagal menyalin'); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && !form.tags.includes(t)) { setForm(f => ({ ...f, tags: [...f.tags, t] })); setTagInput(''); }
  };

  const filtered = snippets.filter(s =>
    s.title.toLowerCase().includes(search.toLowerCase()) ||
    s.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>Code Snippets</p>
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--c-muted)' }}>Simpan snippet favorit — tersimpan di browser</p>
        </div>
        <button onClick={() => setAddOpen(!addOpen)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
          style={{ background: 'var(--c-accent)' }}>
          <MdAdd size={15} /> Snippet
        </button>
      </div>

      {addOpen && (
        <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="useDebounce hook…" className="saturn-input w-full text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase mb-1 block" style={{ color: 'var(--c-muted)' }}>Bahasa</label>
              <select value={form.lang} onChange={e => setForm(f => ({ ...f, lang: e.target.value }))} className="saturn-input w-full text-sm">
                {LANGS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase mb-1 block" style={{ color: 'var(--c-muted)' }}>Warna</label>
              <div className="flex gap-1.5 flex-wrap pt-1">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-6 h-6 rounded-full"
                    style={{ background: c, outline: form.color === c ? `2px solid ${c}` : 'none', outlineOffset: 2 }} />
                ))}
              </div>
            </div>
          </div>
          <textarea value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            placeholder="Paste code di sini…" rows={5} className="saturn-input w-full text-xs resize-none"
            style={{ fontFamily: 'monospace' }} />
          <div className="flex gap-2">
            <input value={tagInput} onChange={e => setTagInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Tags (Enter untuk tambah)…" className="saturn-input flex-1 text-sm" />
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {form.tags.map(t => (
                <span key={t} onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))}
                  className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer"
                  style={{ background: `${form.color}20`, color: form.color, border: `1px solid ${form.color}40` }}>
                  #{t} ×
                </span>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => setAddOpen(false)} className="px-3 py-1.5 rounded-lg text-xs font-semibold"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>Batal</button>
            <button onClick={addSnippet} className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
              style={{ background: 'var(--c-accent)' }}>Simpan Snippet</button>
          </div>
        </div>
      )}

      {snippets.length > 0 && (
        <div className="relative">
          <MdSearch size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--c-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari snippet…" className="saturn-input w-full pl-8 text-sm" />
        </div>
      )}

      {filtered.length === 0 && !addOpen ? (
        <div className="text-center py-10">
          <MdCode size={36} className="mx-auto mb-2 opacity-25" style={{ color: 'var(--c-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--c-muted)' }}>Belum ada snippet</p>
          <p className="text-xs mt-1 opacity-60" style={{ color: 'var(--c-muted)' }}>Klik "+ Snippet" untuk menambahkan kode favoritmu</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
          {filtered.map(s => (
            <div key={s.id} className="rounded-xl overflow-hidden"
              style={{ background: 'var(--c-surface)', border: `1px solid ${s.color}30` }}>
              <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(expanded === s.id ? null : s.id)}>
                <div className="w-[3px] rounded-full self-stretch" style={{ background: s.color, minHeight: 20 }} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-[var(--c-text)] truncate">{s.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: `${s.color}20`, color: s.color }}>{s.lang}</span>
                    {s.tags.slice(0,3).map(t => <span key={t} className="text-[10px]" style={{ color: 'var(--c-muted)' }}>#{t}</span>)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={e => { e.stopPropagation(); copyCode(s.code); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ color: 'var(--c-muted)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-accent)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-muted)')}>
                    <MdContentCopy size={12} />
                  </button>
                  <button onClick={e => { e.stopPropagation(); persist(snippets.filter(x => x.id !== s.id)); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ color: 'var(--c-muted)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-muted)')}>
                    <MdDelete size={12} />
                  </button>
                </div>
              </div>
              {expanded === s.id && (
                <div className="px-4 pb-4">
                  <pre className="text-xs font-mono p-3 rounded-xl overflow-x-auto whitespace-pre-wrap break-all"
                    style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)', maxHeight: 160, fontFamily: 'monospace' }}>
                    {s.code}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── SETTINGS TAB ──────────────────────────────────────────────────────────────
function SettingsTab({ user }: { user: PublicUser }) {
  const [settings,        setSettings]        = useState<SettingsData | null>(null);
  const [showGithubModal, setShowGithubModal] = useState(false);
  const { success } = useToast();

  useEffect(() => {
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: any) => setSettings({ githubOwner: d.githubOwner || '', githubRepo: d.githubRepo || '', lastPush: d.lastPush || '' }))
      .catch(() => {});
  }, []);

  const cloudName    = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || 'dg3awuzug';
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
          <SiGithub size={18} className="text-[var(--c-text)]" />
          <div>
            <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)]">GitHub Data Sync</h3>
            <p className="text-[10px]" style={{ color: 'var(--c-muted)' }}>Push JSON data files ke repository</p>
          </div>
        </div>
        <div className="p-5 flex flex-col gap-4" style={{ background: 'var(--c-bg)' }}>
          {settings ? (
            <div className="grid grid-cols-2 gap-3">
              <InfoBox label="Repository Owner" value={settings.githubOwner} />
              <InfoBox label="Repository"       value={settings.githubRepo}  />
              <InfoBox label="Last Push"        value={settings.lastPush ? format(new Date(settings.lastPush), 'MMM d, yyyy HH:mm') : 'Never'} />
              <InfoBox label="Files Synced"     value="users.json, notes.json, settings.json" />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--c-muted)' }}>
              <MdRefresh size={14} className="animate-spin" /> Loading…
            </div>
          )}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl" style={{ background: 'rgba(59,130,246,.07)', border: '1px solid rgba(59,130,246,.2)' }}>
            <MdInfo size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs leading-relaxed" style={{ color: 'var(--c-muted)' }}>
              Token GitHub harus punya scope <code className="font-mono px-1 rounded text-blue-300" style={{ background: 'rgba(0,0,0,.3)' }}>repo</code>. Password disimpan sebagai bcrypt hash.
            </p>
          </div>
          {(user.role === 'owner' || user.role === 'co-owner') && (
            <button onClick={() => setShowGithubModal(true)} className="btn-primary flex items-center gap-2 w-full justify-center">
              <MdCloudUpload size={16} /> Push to GitHub
            </button>
          )}
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
          <SiCloudinary size={18} className="text-blue-400" />
          <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)]">Cloudinary</h3>
        </div>
        <div className="p-5 grid grid-cols-2 gap-3" style={{ background: 'var(--c-bg)' }}>
          <InfoBox label="Cloud Name"    value={cloudName}    />
          <InfoBox label="Upload Preset" value={uploadPreset} />
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--c-border)' }}>
        <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
          <MdSettings size={18} style={{ color: 'var(--c-muted)' }} />
          <h3 className="font-orbitron text-sm font-bold text-[var(--c-text)]">System Information</h3>
        </div>
        <div className="divide-y" style={{ background: 'var(--c-bg)', borderColor: 'var(--c-border)' }}>
          {[['Version','v6.0.0'],['Framework','Next.js 16 + TypeScript'],['Auth','JWT (jose) + bcryptjs'],['Storage','JSON files'],['Image CDN','Cloudinary']].map(([k,v]) => (
            <div key={k} className="flex justify-between items-center px-4 py-3">
              <span className="text-sm font-medium" style={{ color: 'var(--c-muted)' }}>{k}</span>
              <span className="text-sm font-mono px-2 py-0.5 rounded" style={{ color: 'var(--c-text)', background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {showGithubModal && (
        <GithubPushModal onClose={() => setShowGithubModal(false)} onSuccess={() => { setShowGithubModal(false); success('Synced!'); }} />
      )}
    </div>
  );
}

// ── SHORTCUTS TAB ─────────────────────────────────────────────────────────────
function ShortcutsTab() {
  const [shortcuts, setShortcuts] = useState<ShortcutMap>(DEFAULT_SHORTCUTS);
  const [editing,   setEditing]   = useState<keyof ShortcutMap | null>(null);
  const [listening, setListening] = useState(false);
  const [saved,     setSaved]     = useState(false);

  useEffect(() => { setShortcuts(loadShortcuts()); }, []);

  useEffect(() => {
    if (!listening || !editing) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault(); e.stopPropagation();
      if (e.key === 'Escape') { setListening(false); setEditing(null); return; }
      const sc = eventToShortcut(e);
      if (!sc) return;
      setShortcuts(prev => ({ ...prev, [editing]: sc }));
      setListening(false); setEditing(null);
    };
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [listening, editing]);

  const handleSave = () => {
    saveShortcuts(shortcuts);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        {(Object.keys(shortcuts) as (keyof ShortcutMap)[]).map(key => {
          const isEditing = editing === key && listening;
          return (
            <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
              <span className="text-sm text-[var(--c-text)]">{SHORTCUT_LABELS[key]}</span>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-mono animate-pulse"
                    style={{ background: 'rgba(var(--c-accent-rgb),.2)', color: 'var(--c-accent)', border: '1px solid rgba(var(--c-accent-rgb),.3)' }}>
                    Tekan shortcut…
                  </span>
                ) : (
                  <kbd className="px-2 py-1 rounded-lg text-xs font-mono"
                    style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                    {displayShortcut(shortcuts[key])}
                  </kbd>
                )}
                <button onClick={() => { setEditing(key); setListening(true); }}
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: 'var(--c-muted)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-accent)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-muted)')}>
                  <MdEdit size={12} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button onClick={handleSave} className="btn-primary flex items-center gap-2 justify-center">
        {saved ? <><MdCheckCircle size={15} /> Tersimpan!</> : <><MdCheck size={15} /> Simpan Shortcuts</>}
      </button>
    </div>
  );
}

// ── MAIN MODAL ────────────────────────────────────────────────────────────────
export default function SettingsModal({ open, onClose, user }: Props) {
  const [tab, setTab] = useState<Tab>('profile');

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'profile',   label: 'Profile',   icon: MdPerson              },
    { id: 'notes',     label: 'Notes',     icon: MdBookmark            },
    { id: 'theme',     label: 'Theme',     icon: MdPalette             },
    { id: 'artifact',  label: 'Snippets',  icon: MdCode                },
    { id: 'settings',  label: 'Settings',  icon: MdSettings            },
    { id: 'shortcuts', label: 'Shortcuts', icon: MdKeyboard            },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9000]" onClick={onClose} />
          <div className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}>

              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 border-b flex-shrink-0"
                style={{ borderColor: 'var(--c-border)', background: 'var(--c-surface)' }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))', border: '1px solid rgba(var(--c-accent-rgb),.2)' }}>
                  <MdSettings size={18} style={{ color: 'var(--c-accent)' }} />
                </div>
                <div className="flex-1">
                  <h2 className="font-orbitron text-base font-bold text-[var(--c-text)]">Settings</h2>
                  <p className="text-[11px]" style={{ color: 'var(--c-muted)' }}>Profile, notes, theme, snippets & system</p>
                </div>
                <button onClick={onClose}
                  className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                  style={{ color: 'var(--c-muted)', background: 'var(--c-bg)', border: '1px solid var(--c-border)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-muted)')}>
                  <MdClose size={16} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 px-6 pt-4 pb-0.5 flex-shrink-0 overflow-x-auto">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button key={id} onClick={() => setTab(id)}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all whitespace-nowrap flex-shrink-0"
                    style={{
                      background: tab === id ? 'var(--c-gradient-r)' : 'var(--c-surface)',
                      color:      tab === id ? '#fff' : 'var(--c-muted)',
                      border:     tab === id ? 'none' : '1px solid var(--c-border)',
                      boxShadow:  tab === id ? '0 4px 14px rgba(var(--c-accent-rgb),.3)' : 'none',
                    }}>
                    <Icon size={14} /> {label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                <AnimatePresence mode="wait">
                  <motion.div key={tab}
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.12 }}>
                    {tab === 'profile'   && <ProfileTab  user={user} />}
                    {tab === 'notes'     && <NotesTab    user={user} />}
                    {tab === 'theme'     && <ThemeTab />}
                    {tab === 'artifact'  && <ArtifactTab />}
                    {tab === 'settings'  && <SettingsTab user={user} />}
                    {tab === 'shortcuts' && <ShortcutsTab />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
