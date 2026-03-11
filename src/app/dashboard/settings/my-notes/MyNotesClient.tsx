'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { PublicUser, Note } from '@/types';
import NoteCard from '@/components/notes/NoteCard';
import NoteForm from '@/components/notes/NoteForm';
import ConfirmModal from '@/components/ui/ConfirmModal';
import SavingOverlay from '@/components/ui/SavingOverlay';
import { useToast } from '@/components/ui/Toast';
import {
  MdAdd, MdSearch, MdBookmark, MdClose,
} from 'react-icons/md';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  user: PublicUser;
  initialNotes: Note[];
  highlightId?: string;
}

export default function MyNotesClient({ user, initialNotes, highlightId }: Props) {
  const [notes,        setNotes]        = useState<Note[]>(initialNotes);
  const [search,       setSearch]       = useState('');
  const [addOpen,      setAddOpen]      = useState(false);
  const [editNote,     setEditNote]     = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [detailNote,   setDetailNote]   = useState<Note | null>(null);
  const [saving,       setSaving]       = useState(false);
  const { success, error: toastError }  = useToast();

  // Fetch only own notes
  const fetchNotes = useCallback(async () => {
    try {
      const res  = await fetch('/api/notes');
      const data = await res.json();
      if (data.success) {
        const mine = (data.data as Note[]).filter(n => n.authorId === user.id && !n.hidden);
        setNotes(mine);
      }
    } catch {}
  }, [user.id]);

  const handleCreate = async (form: { title: string; content: string; images: string[]; tags: string[]; color: string }) => {
    setSaving(true);
    try {
      const res  = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { success('Note created!'); setAddOpen(false); await fetchNotes(); }
      else throw new Error(data.error || 'Failed');
    } catch (err: any) { toastError(err.message); }
    finally { setSaving(false); }
  };

  const handleEdit = async (form: { title: string; content: string; images: string[]; tags: string[]; color: string }) => {
    if (!editNote) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/notes/${editNote.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update', ...form }),
      });
      const data = await res.json();
      if (data.success) { success('Note updated!'); setEditNote(null); await fetchNotes(); }
      else throw new Error(data.error || 'Failed');
    } catch (err: any) { toastError(err.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res  = await fetch(`/api/notes/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        success('Note deleted!');
        setDeleteTarget(null);
        setNotes((p: import('@/types').Note[]) => p.filter((n: import('@/types').Note) => n.id !== deleteTarget!.id));
      } else throw new Error(data.error || 'Failed');
    } catch (err: any) { toastError(err.message); }
    finally { setSaving(false); }
  };

  const filtered = notes.filter((n: import('@/types').Note) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase()) ||
    n.tags.some((t: string) => t.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <SavingOverlay visible={saving} message="Saving…" submessage="Syncing your note" />

      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-cyan-600/30 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <MdBookmark size={24} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">My Notes</h1>
            <p className="text-[var(--c-muted)] text-sm">{notes.length} note{notes.length !== 1 ? 's' : ''} by you</p>
          </div>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary">
          <MdAdd size={18} /> New Note
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MdSearch size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--c-muted)]" />
        <input
          type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search your notes…"
          className="saturn-input pl-10 w-full focus:outline-none"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors">
            <MdClose size={16} />
          </button>
        )}
      </div>

      {/* Notes grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
            <MdBookmark size={32} className="text-emerald-400/50" />
          </div>
          <h3 className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">
            {search ? 'No results' : 'No notes yet'}
          </h3>
          <p className="text-[var(--c-muted)] text-sm mb-6">
            {search ? `No notes match "${search}"` : 'Create your first private note'}
          </p>
          {!search && (
            <button onClick={() => setAddOpen(true)} className="btn-primary">
              <MdAdd size={18} /> Create Note
            </button>
          )}
        </div>
      ) : (
        <motion.div layout className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence>
            {filtered.map(note => (
              <NoteCard
                key={note.id}
                note={note}
                currentUser={user}
                onEdit={() => setEditNote(note)}
                onDelete={() => setDeleteTarget(note)}
                onPreview={() => setDetailNote(note)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Add note form */}
      {addOpen && (
        <NoteForm
          authorName={user.username}
          onSubmit={handleCreate}
          onClose={() => setAddOpen(false)}
          submitting={saving}
        />
      )}

      {/* Edit note form */}
      {editNote && (
        <NoteForm
          initialData={editNote}
          authorName={user.username}
          onSubmit={handleEdit}
          onClose={() => setEditNote(null)}
          submitting={saving}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmModal
          open
          title="Delete Note"
          message={`Delete "${deleteTarget.title}"? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
