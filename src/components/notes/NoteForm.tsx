"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Note } from "@/types";
import {
  MdClose, MdAdd, MdTag, MdSave, MdDelete, MdImage,
  MdTitle, MdNotes,
} from "react-icons/md";
import Modal from "../ui/Modal";
import ImageCropper from "../ui/ImageCropper";

const CLOUD_NAME    = "dg3awuzug";
const UPLOAD_PRESET = "ml_default";

const COLORS = ["violet", "cyan", "pink", "amber", "teal", "blue"];

const SWATCH: Record<string, string> = {
  violet: "bg-violet-500", cyan: "bg-cyan-500", pink: "bg-pink-500",
  amber:  "bg-amber-500",  teal: "bg-teal-500", blue: "bg-blue-500",
};
const BORDER_COLOR: Record<string, string> = {
  violet: "border-violet-500", cyan: "border-cyan-500", pink: "border-pink-500",
  amber:  "border-amber-500",  teal: "border-teal-500", blue: "border-blue-500",
};
const TEXT_COLOR: Record<string, string> = {
  violet: "text-violet-400", cyan: "text-cyan-400", pink: "text-pink-400",
  amber:  "text-amber-400",  teal: "text-teal-400", blue: "text-blue-400",
};
const BG_COLOR: Record<string, string> = {
  violet: "from-violet-900/20 to-violet-900/5",
  cyan:   "from-cyan-900/20 to-cyan-900/5",
  pink:   "from-pink-900/20 to-pink-900/5",
  amber:  "from-amber-900/20 to-amber-900/5",
  teal:   "from-teal-900/20 to-teal-900/5",
  blue:   "from-blue-900/20 to-blue-900/5",
};

const MAX_TITLE   = 80;
const MAX_CONTENT = 2000;

interface NoteFormProps {
  initialData?: Partial<Note>;
  authorName?: string;
  onSubmit: (data: { title: string; content: string; images: string[]; tags: string[]; color: string }) => Promise<void>;
  onClose: () => void;
  submitting?: boolean;
}

/* ── Live Preview Panel ─────────────────────────────────────────────────── */
function NotePreviewPanel({ title, content, tags, color, images, authorName }: {
  title: string; content: string; tags: string[]; color: string;
  images: string[]; authorName?: string;
}) {
  return (
    <div className="flex flex-col h-full p-4 overflow-y-auto"
      style={{ background: "var(--c-surface)", borderRight: "1px solid var(--c-border)" }}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-muted)] mb-3 flex items-center gap-1.5">
        <MdNotes size={11} /> Live Preview
      </p>
      <div className={`rounded-2xl overflow-hidden border-l-4 ${BORDER_COLOR[color] || "border-violet-500"} bg-gradient-to-br ${BG_COLOR[color] || BG_COLOR.violet} border border-white/8`}>
        <div className="p-3 pb-2">
          <h3 className={`font-semibold text-sm leading-tight ${TEXT_COLOR[color] || "text-violet-400"} ${!title ? "opacity-30 italic" : ""}`}>
            {title || "Note title…"}
          </h3>
          {authorName && <p className="text-[var(--c-muted)] text-[10px] font-mono mt-1">@{authorName}</p>}
        </div>
        {content && (
          <div className="px-3 pb-2">
            <p className="text-[var(--c-muted)] text-xs leading-relaxed whitespace-pre-wrap line-clamp-5">{content}</p>
          </div>
        )}
        {images.length > 0 && (
          <div className="px-3 pb-2">
            <div className={`grid gap-1 ${images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
              {images.slice(0, 4).map((img, i) => (
                <div key={i} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                  <Image src={img} alt="" fill className="object-cover" sizes="120px" />
                  {i === 3 && images.length > 4 && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                      +{images.length - 4}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {tags.length > 0 && (
          <div className="px-3 pb-3 flex flex-wrap gap-1">
            {tags.map(t => (
              <span key={t} className="text-[9px] bg-white/5 text-[var(--c-muted)] px-2 py-0.5 rounded-full flex items-center gap-0.5">
                <MdTag size={9} /> {t}
              </span>
            ))}
          </div>
        )}
        <div className={`h-0.5 w-full ${SWATCH[color] || "bg-violet-500"} opacity-40`} />
      </div>
      <div className="mt-auto pt-4 space-y-1.5 text-[10px] text-[var(--c-muted)]">
        {([
          ["Title",   `${title.length}/${MAX_TITLE}`,    title.length > MAX_TITLE * 0.8],
          ["Content", `${content.length}/${MAX_CONTENT}`, content.length > MAX_CONTENT * 0.8],
          ["Images",  `${images.length}`,                false],
          ["Tags",    `${tags.length}/10`,               false],
        ] as [string, string, boolean][]).map(([k, v, warn]) => (
          <div key={k} className="flex justify-between">
            <span>{k}</span>
            <span className={warn ? "text-amber-400" : ""}>{v}</span>
          </div>
        ))}
        <div className="flex justify-between">
          <span>Color</span>
          <span className={TEXT_COLOR[color] || "text-violet-400"}>{color}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Cloudinary XHR upload (supports progress) ──────────────────────────── */
async function uploadToCloudinary(file: File, onProgress?: (p: number) => void): Promise<string | null> {
  return new Promise((resolve) => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("upload_preset", UPLOAD_PRESET);
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload  = () => { const d = JSON.parse(xhr.responseText); resolve(d.secure_url || null); };
    xhr.onerror = () => resolve(null);
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`);
    xhr.send(fd);
  });
}

/* ── dataUrl → File ─────────────────────────────────────────────────────── */
function dataUrlToFile(dataUrl: string, name: string): File {
  const arr  = dataUrl.split(",");
  const mime = arr[0].match(/:(.*?);/)![1];
  const bstr = atob(arr[1]);
  const u8   = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new File([u8], name, { type: mime });
}

/* ══════════════════════════════════════════════════════════════════════════
   NoteForm — main export
   Uses a React Fragment (<>) so ImageCropper (a portal) can be a sibling
   of Modal without nesting issues.
══════════════════════════════════════════════════════════════════════════ */
export default function NoteForm({ initialData, authorName, onSubmit, onClose, submitting }: NoteFormProps) {
  const [title,     setTitle]    = useState(initialData?.title   || "");
  const [content,   setContent]  = useState(initialData?.content || "");
  const [images,    setImages]   = useState<string[]>(initialData?.images || []);
  const [tags,      setTags]     = useState<string[]>(initialData?.tags   || []);
  const [color,     setColor]    = useState(initialData?.color   || "violet");
  const [tagInput,  setTagInput] = useState("");
  const [showImgUp, setShowImgUp]= useState(false);
  const [uploading, setUploading]= useState(false);
  const [progress,  setProgress] = useState(0);

  // Crop state
  const [cropSrc,   setCropSrc]  = useState<string | null>(null);
  const [cropName,  setCropName] = useState("image.jpg");

  const fileRef   = useRef<HTMLInputElement>(null);
  const imgUrlRef = useRef<HTMLInputElement>(null);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t) && tags.length < 10) setTags(p => [...p, t]);
    setTagInput("");
  };

  const addImgUrl = () => {
    const u = imgUrlRef.current?.value.trim() ?? "";
    if (u.startsWith("http")) {
      setImages(p => [...p, u]);
      if (imgUrlRef.current) imgUrlRef.current.value = "";
    }
  };

  // User picks a file → open crop editor
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => { if (ev.target?.result) setCropSrc(ev.target.result as string); };
    reader.readAsDataURL(file);
    e.target.value = ""; // allow re-pick
  };

  // Crop editor done → upload to Cloudinary
  const handleCropDone = async (dataUrl: string) => {
    setCropSrc(null);
    const file = dataUrlToFile(dataUrl, cropName);
    setUploading(true); setProgress(0);
    const url = await uploadToCloudinary(file, setProgress);
    setUploading(false); setProgress(0);
    if (url) setImages(p => [...p, url]);
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onSubmit({ title: title.trim(), content: content.trim(), images, tags, color });
  };

  // The fragment is REQUIRED so ImageCropper (portal) can sit beside Modal
  return (
    <>
      <Modal open onClose={submitting ? undefined : onClose}>
        <div
          className="w-full rounded-2xl overflow-hidden shadow-2xl flex flex-col"
          style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)", maxHeight: "90dvh", maxWidth: "min(920px, 98vw)" }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b flex-shrink-0"
            style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
            <div className={`w-3 h-3 rounded-full ${SWATCH[color]}`} />
            <h2 className="font-orbitron text-sm font-bold text-[var(--c-text)] flex-1">
              {initialData?.id ? "Edit Note" : "New Note"}
            </h2>
            <div className="flex gap-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} title={c}
                  className={`w-5 h-5 rounded-full ${SWATCH[c]} transition-all duration-150 ${color === c ? "ring-2 ring-white ring-offset-1 ring-offset-[var(--c-surface)] scale-110" : "opacity-50 hover:opacity-100"}`} />
              ))}
            </div>
            <button onClick={onClose} disabled={!!submitting}
              className="ml-2 text-[var(--c-muted)] hover:text-[var(--c-text)] p-1.5 rounded-lg hover:bg-[var(--c-surface)] transition-colors disabled:opacity-50">
              <MdClose size={18} />
            </button>
          </div>

          {/* Body */}
          <div className="flex flex-1 overflow-hidden min-h-0">
            {/* Live preview — hidden on xs */}
            <div className="w-48 flex-shrink-0 hidden sm:flex flex-col overflow-hidden">
              <NotePreviewPanel title={title} content={content} tags={tags}
                color={color} images={images} authorName={authorName} />
            </div>

            {/* Form fields */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

              {/* Title */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <MdTitle size={12} /> Title *
                  </label>
                  <span className={`text-[10px] ${title.length > MAX_TITLE * 0.85 ? "text-amber-400" : "text-[var(--c-muted)]"}`}>
                    {title.length}/{MAX_TITLE}
                  </span>
                </div>
                <input
                  type="text" value={title}
                  onChange={e => setTitle(e.target.value.slice(0, MAX_TITLE))}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); document.getElementById("note-content-field")?.focus(); } }}
                  placeholder="Note title…" autoComplete="off" name="saturn_note__title"
                  className="saturn-input w-full focus:outline-none"
                />
              </div>

              {/* Content */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <MdNotes size={12} /> Content
                  </label>
                  <span className={`text-[10px] ${content.length > MAX_CONTENT * 0.85 ? "text-amber-400" : "text-[var(--c-muted)]"}`}>
                    {content.length}/{MAX_CONTENT}
                  </span>
                </div>
                <textarea
                  id="note-content-field" value={content}
                  onChange={e => setContent(e.target.value.slice(0, MAX_CONTENT))}
                  onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") { e.preventDefault(); if (title.trim()) handleSubmit(); } }}
                  placeholder="Write your note here…" rows={6}
                  autoComplete="off" name="saturn_note__content"
                  className="saturn-input resize-y w-full focus:outline-none min-h-[120px]"
                />
                <p className="text-[10px] text-[var(--c-muted)] opacity-40 mt-1 text-right">Ctrl+Enter to save</p>
              </div>

              {/* Tags */}
              <div>
                <label className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <MdTag size={12} /> Tags ({tags.length}/10)
                </label>
                {tags.length > 0 && (
                  <div className="flex gap-2 mb-2 flex-wrap">
                    {tags.map(tag => (
                      <span key={tag} className="flex items-center gap-1 text-xs bg-violet-500/15 text-violet-300 border border-violet-500/20 px-2.5 py-1 rounded-full">
                        <MdTag size={11} /> {tag}
                        <button onClick={() => setTags(p => p.filter(t => t !== tag))} className="hover:text-red-400 ml-0.5 transition-colors">×</button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input type="text" value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                    placeholder="Add tag… (Enter)" maxLength={20}
                    autoComplete="off" name="saturn_note__tag"
                    className="saturn-input flex-1 focus:outline-none" />
                  <button onClick={addTag} disabled={tags.length >= 10}
                    className="btn-secondary px-3 disabled:opacity-40"><MdAdd size={18} /></button>
                </div>
              </div>

              {/* Images */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <MdImage size={12} /> Images ({images.length})
                  </label>
                  <button onClick={() => setShowImgUp(p => !p)}
                    className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    {showImgUp ? "Hide uploader" : "Add images"}
                  </button>
                </div>

                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    {images.map((img, i) => (
                      <div key={i} className="relative rounded-xl overflow-hidden group" style={{ aspectRatio: "16/9" }}>
                        <Image src={img} alt="" fill className="object-cover" sizes="100px" />
                        <button onClick={() => setImages(p => p.filter((_, j) => j !== i))}
                          className="absolute top-1 right-1 bg-red-600/90 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MdDelete size={11} className="text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {showImgUp && (
                  <div className="space-y-3">
                    {/* Hidden file input */}
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

                    {/* Upload button */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                      style={{ background: "var(--c-surface)", border: "2px dashed var(--c-border)", color: "var(--c-muted)" }}
                    >
                      {uploading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                          Uploading… {progress}%
                        </>
                      ) : (
                        <>
                          <MdImage size={18} className="text-violet-400" />
                          Choose photo — opens crop &amp; resize editor
                        </>
                      )}
                    </button>

                    {/* URL input */}
                    <div className="flex gap-2">
                      <input ref={imgUrlRef} type="url"
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addImgUrl(); } }}
                        placeholder="Or paste image URL…"
                        autoComplete="off" name="saturn_note__imgurl"
                        className="saturn-input flex-1 text-sm focus:outline-none" />
                      <button onClick={addImgUrl} className="btn-secondary px-3"><MdAdd size={18} /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-5 py-3.5 border-t flex-shrink-0"
            style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
            <button onClick={onClose} disabled={!!submitting} className="btn-secondary flex-1 disabled:opacity-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={!title.trim() || !!submitting} title="Save (Ctrl+Enter)"
              className="btn-primary flex-1 disabled:opacity-50">
              {submitting
                ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Saving…</>
                : <><MdSave size={17} /> {initialData?.id ? "Update Note" : "Save Note"}</>}
            </button>
          </div>
        </div>
      </Modal>

      {/* ImageCropper renders as a portal directly to body — NOT nested in Modal */}
      {cropSrc !== null && (
        <ImageCropper
          src={cropSrc}
          shape="rect"
          onCancel={() => setCropSrc(null)}
          onCrop={handleCropDone}
        />
      )}
    </>
  );
}
