'use client';

import { useState, useRef, useCallback } from 'react';
import { PublicUser } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MdRestore, MdUpload, MdWarning, MdCheckCircle, MdInfo,
  MdClose, MdPeople, MdNotes, MdSettings, MdFolderOpen,
  MdRefresh,
} from 'react-icons/md';

interface Props { user: PublicUser }

interface BackupContents {
  users?:    unknown[];
  notes?:    unknown[];
  settings?: Record<string, unknown>;
  manifest?: Record<string, unknown>;
}

interface PreviewItem {
  label: string;
  count?: number;
  icon: React.ElementType;
  color: string;
  found: boolean;
}

export default function RestoreClient({ user }: Props) {
  const [dragging,    setDragging]    = useState(false);
  const [parsing,     setParsing]     = useState(false);
  const [restoring,   setRestoring]   = useState(false);
  const [parsed,      setParsed]      = useState<BackupContents | null>(null);
  const [fileName,    setFileName]    = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [restored,    setRestored]    = useState(false);
  const [restoreMsg,  setRestoreMsg]  = useState('');
  const [selection,   setSelection]   = useState({ users: true, notes: true, settings: true });

  const fileRef = useRef<HTMLInputElement>(null);
  const { success, error: toastError } = useToast();

  // ── Parse zip file in-browser using JSZip-free approach ──────────────
  // We read the zip and extract JSON files from it
  const parseZip = async (file: File): Promise<BackupContents> => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const result: BackupContents = {};

    // Find PK local file headers (0x04034b50)
    let i = 0;
    while (i < bytes.length - 4) {
      if (bytes[i] === 0x50 && bytes[i+1] === 0x4b && bytes[i+2] === 0x03 && bytes[i+3] === 0x04) {
        const compression = bytes[i+8] | (bytes[i+9] << 8);
        const compressedSize   = bytes[i+18] | (bytes[i+19] << 8) | (bytes[i+20] << 16) | (bytes[i+21] << 24);
        const uncompressedSize = bytes[i+22] | (bytes[i+23] << 8) | (bytes[i+24] << 16) | (bytes[i+25] << 24);
        const fnLen  = bytes[i+26] | (bytes[i+27] << 8);
        const exLen  = bytes[i+28] | (bytes[i+29] << 8);
        const fnStart = i + 30;
        const fnEnd   = fnStart + fnLen;
        const dataStart = fnEnd + exLen;
        const dataEnd   = dataStart + compressedSize;

        const fileName = new TextDecoder().decode(bytes.slice(fnStart, fnEnd));

        if (compression === 0 && uncompressedSize > 0) {
          // STORED (no compression)
          const raw = new TextDecoder().decode(bytes.slice(dataStart, dataStart + uncompressedSize));
          try {
            const parsed = JSON.parse(raw);
            if (fileName.endsWith('users.json'))    result.users    = Array.isArray(parsed) ? parsed : [];
            if (fileName.endsWith('notes.json'))    result.notes    = Array.isArray(parsed) ? parsed : [];
            if (fileName.endsWith('settings.json')) result.settings = typeof parsed === 'object' ? parsed : {};
            if (fileName.endsWith('manifest.json')) result.manifest = typeof parsed === 'object' ? parsed : {};
          } catch {}
        } else if (compression === 8) {
          // DEFLATE — use DecompressionStream if available
          try {
            const compressed = bytes.slice(dataStart, dataEnd);
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            const reader = ds.readable.getReader();
            writer.write(compressed);
            writer.close();
            const chunks: Uint8Array[] = [];
            let done = false;
            while (!done) {
              const { value, done: d } = await reader.read();
              if (value) chunks.push(value);
              done = d;
            }
            const all = new Uint8Array(chunks.reduce((a, c) => a + c.length, 0));
            let off = 0;
            for (const ch of chunks) { all.set(ch, off); off += ch.length; }
            const raw = new TextDecoder().decode(all);
            const parsed = JSON.parse(raw);
            if (fileName.endsWith('users.json'))    result.users    = Array.isArray(parsed) ? parsed : [];
            if (fileName.endsWith('notes.json'))    result.notes    = Array.isArray(parsed) ? parsed : [];
            if (fileName.endsWith('settings.json')) result.settings = typeof parsed === 'object' ? parsed : {};
            if (fileName.endsWith('manifest.json')) result.manifest = typeof parsed === 'object' ? parsed : {};
          } catch {}
        }

        i = dataEnd;
      } else {
        i++;
      }
    }
    return result;
  };

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toastError('File harus berformat .zip');
      return;
    }
    setParsing(true);
    setParsed(null);
    setRestored(false);
    setFileName(file.name);
    try {
      const contents = await parseZip(file);
      if (!contents.users && !contents.notes && !contents.settings) {
        toastError('Tidak ada data valid ditemukan di file backup ini');
        return;
      }
      setParsed(contents);
      setSelection({
        users:    !!contents.users,
        notes:    !!contents.notes,
        settings: !!contents.settings,
      });
    } catch (e: any) {
      toastError('Gagal membaca file backup: ' + e.message);
    } finally {
      setParsing(false);
    }
  }, [toastError]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const doRestore = async () => {
    if (!parsed) return;
    setRestoring(true);
    setShowConfirm(false);
    try {
      const body: Record<string, unknown> = {};
      if (selection.users    && parsed.users)    body.users    = parsed.users;
      if (selection.notes    && parsed.notes)    body.notes    = parsed.notes;
      if (selection.settings && parsed.settings) body.settings = parsed.settings;

      const res = await fetch('/api/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        setRestored(true);
        setRestoreMsg(d.message);
        success('Data berhasil di-restore!');
      } else {
        throw new Error(d.error || 'Restore gagal');
      }
    } catch (e: any) {
      toastError(e.message);
    } finally {
      setRestoring(false);
    }
  };

  const reset = () => {
    setParsed(null);
    setFileName('');
    setRestored(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const previewItems: PreviewItem[] = [
    { label: 'Users',    count: parsed?.users?.length,    icon: MdPeople,   color: 'text-violet-400', found: !!parsed?.users    },
    { label: 'Notes',    count: parsed?.notes?.length,    icon: MdNotes,    color: 'text-cyan-400',   found: !!parsed?.notes    },
    { label: 'Settings', count: undefined,                icon: MdSettings, color: 'text-amber-400',  found: !!parsed?.settings },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      {/* ── Header ── */}
      <div>
        <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Restore Data</h1>
        <p className="text-[var(--c-muted)] text-sm mt-1 font-nunito">Pulihkan data dari file backup (.zip)</p>
      </div>

      {/* ── Warning ── */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.25)' }}>
        <MdWarning size={18} className="text-red-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs leading-relaxed" style={{ color: 'var(--c-muted)' }}>
          <span className="font-bold text-red-400">Perhatian:</span>{' '}
          Restore akan <strong className="text-[var(--c-text)]">menimpa data yang ada sekarang</strong>.
          Pastikan kamu sudah membuat backup baru sebelum melakukan restore.
          Hanya owner yang dapat melakukan restore.
        </p>
      </div>

      {/* ── Drop zone ── */}
      {!parsed && !parsing && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer"
          style={{ borderColor: dragging ? 'var(--c-accent)' : 'var(--c-border)', background: dragging ? 'rgba(var(--c-accent-rgb),.06)' : 'var(--c-surface)' }}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}>
          <div className="flex flex-col items-center gap-4 py-14">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(var(--c-accent-rgb),.2),rgba(var(--c-accent2-rgb),.1))', border: '1px solid rgba(var(--c-accent-rgb),.2)' }}>
              <MdFolderOpen size={32} style={{ color: 'var(--c-accent)' }} />
            </div>
            <div className="text-center">
              <p className="font-orbitron font-bold text-[var(--c-text)] text-base">Drop file backup di sini</p>
              <p className="text-[var(--c-muted)] text-sm mt-1">atau klik untuk pilih file</p>
              <p className="text-[var(--c-muted)] text-xs mt-2 opacity-60">Format: .zip (Saturn Dashboard backup)</p>
            </div>
            <button className="btn-primary flex items-center gap-2 pointer-events-none">
              <MdUpload size={16} /> Pilih File Backup
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Parsing spinner ── */}
      {parsing && (
        <div className="flex items-center justify-center gap-3 py-16 rounded-2xl"
          style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
          <MdRefresh size={22} className="animate-spin" style={{ color: 'var(--c-accent)' }} />
          <span className="text-[var(--c-muted)] font-medium">Membaca file backup…</span>
        </div>
      )}

      {/* ── Preview + select ── */}
      <AnimatePresence>
        {parsed && !restored && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)' }}>

            {/* File info */}
            <div className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: 'var(--c-border)', background: 'var(--c-bg)' }}>
              <div className="flex items-center gap-3">
                <MdCheckCircle size={18} className="text-green-400" />
                <div>
                  <p className="text-[var(--c-text)] font-semibold text-sm">{fileName}</p>
                  {parsed.manifest && (
                    <p className="text-[var(--c-muted)] text-[10px] font-mono mt-0.5">
                      {(parsed.manifest as any).version || 'Saturn Backup'} •{' '}
                      {(parsed.manifest as any).createdAt
                        ? new Date((parsed.manifest as any).createdAt).toLocaleString('id-ID')
                        : ''}
                    </p>
                  )}
                </div>
              </div>
              <button onClick={reset}
                className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'var(--c-muted)', border: '1px solid var(--c-border)', background: 'var(--c-surface)' }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--c-text)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--c-muted)')}>
                <MdClose size={14} />
              </button>
            </div>

            {/* Select what to restore */}
            <div className="p-5 flex flex-col gap-3">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--c-muted)' }}>
                Pilih data yang akan di-restore
              </p>
              {previewItems.map(item => {
                const Icon = item.icon;
                const key = item.label.toLowerCase() as keyof typeof selection;
                if (!item.found) return null;
                return (
                  <button key={item.label} onClick={() => setSelection(s => ({ ...s, [key]: !s[key] }))}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all text-left"
                    style={{
                      background: selection[key] ? 'rgba(var(--c-accent-rgb),.08)' : 'var(--c-bg)',
                      border: selection[key] ? '1px solid rgba(var(--c-accent-rgb),.25)' : '1px solid var(--c-border)',
                    }}>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}
                      style={{ background: selection[key] ? 'rgba(var(--c-accent-rgb),.15)' : 'var(--c-surface)', border: '1px solid var(--c-border)' }}>
                      <Icon size={18} className={item.color} />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm text-[var(--c-text)]">{item.label}</p>
                      {item.count !== undefined && (
                        <p className="text-xs" style={{ color: 'var(--c-muted)' }}>{item.count} records</p>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all`}
                      style={{
                        borderColor: selection[key] ? 'var(--c-accent)' : 'var(--c-border)',
                        background:  selection[key] ? 'var(--c-accent)' : 'transparent',
                      }}>
                      {selection[key] && <MdCheckCircle size={12} className="text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action */}
            <div className="px-5 pb-5 pt-1 flex gap-3">
              <button onClick={reset}
                className="px-4 py-2.5 rounded-xl font-bold text-sm transition flex-shrink-0"
                style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
                Batal
              </button>
              <button onClick={() => setShowConfirm(true)}
                disabled={!Object.values(selection).some(Boolean) || restoring}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white transition"
                style={{ background: 'linear-gradient(135deg,#dc2626,#9333ea)', opacity: !Object.values(selection).some(Boolean) ? 0.4 : 1 }}>
                <MdRestore size={16} /> Restore Sekarang
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Success state ── */}
      <AnimatePresence>
        {restored && (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-8 text-center"
            style={{ background: 'var(--c-surface)', border: '1px solid rgba(34,197,94,.3)' }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.25)' }}>
              <MdCheckCircle size={36} className="text-green-400" />
            </div>
            <h3 className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">Restore Berhasil!</h3>
            <p className="text-[var(--c-muted)] text-sm mb-1">{restoreMsg}</p>
            <p className="text-[var(--c-muted)] text-xs opacity-70 mb-6">Halaman akan di-refresh untuk menerapkan perubahan.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={reset}
                className="px-4 py-2 rounded-xl font-semibold text-sm transition"
                style={{ background: 'var(--c-bg)', border: '1px solid var(--c-border)', color: 'var(--c-muted)' }}>
                Restore Lagi
              </button>
              <button onClick={() => { window.location.href = '/dashboard'; }}
                className="btn-primary flex items-center gap-2">
                <MdRefresh size={15} /> Reload Dashboard
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Confirm modal ── */}
      <AnimatePresence>
        {showConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9000] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowConfirm(false)} />
            <div className="fixed inset-0 z-[9001] flex items-center justify-center p-4 pointer-events-none">
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
                className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: 'var(--c-surface)', border: '1px solid rgba(239,68,68,.35)' }}>
                <div className="p-6 text-center">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)' }}>
                    <MdWarning size={30} className="text-red-400" />
                  </div>
                  <h3 className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">Konfirmasi Restore</h3>
                  <p className="text-sm leading-relaxed mb-4" style={{ color: 'var(--c-muted)' }}>
                    Data yang dipilih akan <strong className="text-red-400">menimpa data saat ini</strong>.
                    Tindakan ini tidak dapat dibatalkan.
                  </p>
                  <div className="text-left px-2 space-y-1">
                    {previewItems.filter(i => i.found && selection[i.label.toLowerCase() as keyof typeof selection]).map(item => (
                      <div key={item.label} className="flex items-center gap-2 text-xs">
                        <span className="text-green-400">✓</span>
                        <span className={item.color + ' font-semibold'}>{item.label}</span>
                        {item.count !== undefined && <span style={{ color: 'var(--c-muted)' }}>({item.count} records)</span>}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-3 p-4" style={{ background: 'rgba(0,0,0,.1)' }}>
                  <button onClick={() => setShowConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm transition"
                    style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border)', color: 'var(--c-text)' }}>
                    Batal
                  </button>
                  <button onClick={doRestore} disabled={restoring}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#dc2626,#9333ea)' }}>
                    {restoring ? <><MdRefresh size={15} className="animate-spin" /> Restoring…</> : <><MdRestore size={15} /> Ya, Restore</>}
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <input ref={fileRef} type="file" accept=".zip" className="hidden" onChange={onFileInput} />

      {/* Info card */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl"
        style={{ background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.2)' }}>
        <MdInfo size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed space-y-1" style={{ color: 'var(--c-muted)' }}>
          <p><strong className="text-[var(--c-text)]">Format yang didukung:</strong> File .zip dari fitur Backup Saturn Dashboard.</p>
          <p><strong className="text-[var(--c-text)]">GitHub token</strong> tidak disertakan dalam backup dan tidak akan di-restore — aman.</p>
          <p><strong className="text-[var(--c-text)]">Password</strong> tetap sebagai bcrypt hash — tidak ada password yang terbuka.</p>
        </div>
      </div>
    </div>
  );
}
