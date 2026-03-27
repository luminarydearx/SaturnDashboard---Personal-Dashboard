"use client";

import Image from "next/image";
import { Note, PublicUser } from "@/types";
import { roleBadgeClass } from "@/lib/auth.utils";
import {
  MdDelete, MdVisibilityOff, MdVisibility, MdEdit, MdTag, MdImage,
  MdFullscreen, MdPushPin, MdContentCopy, MdCheck, MdCheckCircle,
} from "react-icons/md";
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";

const COLORS: Record<string, string> = {
  violet: "border-l-violet-500", cyan: "border-l-cyan-500", pink: "border-l-pink-500",
  amber:  "border-l-amber-500",  teal: "border-l-teal-500", blue: "border-l-blue-500",
};
const GLOW: Record<string, string> = {
  violet: "hover:shadow-[0_0_24px_rgba(139,92,246,0.2)]",
  cyan:   "hover:shadow-[0_0_24px_rgba(6,182,212,0.2)]",
  pink:   "hover:shadow-[0_0_24px_rgba(236,72,153,0.2)]",
  amber:  "hover:shadow-[0_0_24px_rgba(245,158,11,0.2)]",
  teal:   "hover:shadow-[0_0_24px_rgba(20,184,166,0.2)]",
  blue:   "hover:shadow-[0_0_24px_rgba(59,130,246,0.2)]",
};

interface Props {
  key?: React.Key;
  note: Note;
  currentUser: PublicUser;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggleHide?: () => void;
  onTogglePin?: () => void;
  onToggleDone?: () => void;
  onPreview?: () => void;
}

export default function NoteCard({ note, currentUser, onEdit, onDelete, onToggleHide, onTogglePin, onToggleDone, onPreview }: Props) {
  const isOwner  = currentUser.role === "owner" || currentUser.role === "co-owner";
  const isAdmin  = currentUser.role === "admin";
  const isAuthor = note.authorId === currentUser.id;
  const [copied, setCopied] = useState(false);

  const canDelete = isOwner || (isAdmin && note.authorRole === "user") || isAuthor;
  const canHide   = isOwner;
  const canEdit   = isAuthor;
  const canPin    = isOwner || isAuthor;
  const canDone   = isAuthor || isOwner;

  if (note.hidden && !isOwner) return null;

  const copyContent = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${note.title}\n\n${note.content}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`glass group border border-white/8 rounded-2xl overflow-hidden transition-all duration-200
        hover:border-violet-500/30 ${GLOW[note.color] || GLOW.violet}
        border-l-4 ${COLORS[note.color] || COLORS.violet}
        ${note.hidden ? "opacity-60" : ""}
        ${note.done ? "opacity-75 ring-1 ring-emerald-500/20" : ""}
        ${note.pinned && !note.done ? "ring-1 ring-amber-500/30" : ""}`}
    >
      {/* Done / pinned badges */}
      {(note.pinned || note.done) && (
        <div className="flex gap-1.5 px-3 pt-2">
          {note.done && (
            <span className="flex items-center gap-1 text-[9px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
              <MdCheckCircle size={10} /> Done – auto-deletes in 24h
            </span>
          )}
          {note.pinned && !note.done && (
            <span className="flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/20 font-semibold">
              📌 Pinned
            </span>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="p-4 pb-2 cursor-pointer" onClick={onPreview}>
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className={`font-semibold text-[var(--c-text)] text-sm leading-snug flex-1 min-w-0 ${note.done ? "line-through opacity-60" : ""}`}>
            {note.title}
          </h3>
          <span className={`text-[10px] font-bold capitalize flex-shrink-0 px-1.5 py-0.5 rounded-full ${roleBadgeClass(note.authorRole)}`}>
            {note.authorRole}
          </span>
        </div>
        {note.content && (
          <p className={`text-[var(--c-muted)] text-xs leading-relaxed line-clamp-3 ${note.done ? "opacity-60" : ""}`}>
            {note.content}
          </p>
        )}
        {note.images && note.images.length > 0 && (
          <div className={`grid gap-1 mt-2 ${note.images.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {note.images.slice(0, 4).map((img, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden" style={{ aspectRatio: "16/9" }}>
                <Image src={img} alt="" fill className="object-cover" sizes="150px" />
                {i === 3 && note.images.length > 4 && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-bold">
                    +{note.images.length - 4}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tags */}
      {note.tags && note.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1">
          {note.tags.slice(0, 4).map(tag => (
            <span key={tag} className="flex items-center gap-0.5 text-[10px] text-[var(--c-muted)] bg-white/5 px-1.5 py-0.5 rounded-md">
              <MdTag size={9} />{tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-2.5 border-t flex items-center justify-between" style={{ borderColor: "var(--c-border)" }}>
        <span className="text-[var(--c-muted)] text-[10px] font-mono">
          {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true })}
        </span>

        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {canDone && onToggleDone && (
            <button onClick={e => { e.stopPropagation(); onToggleDone(); }}
              className={`p-1.5 rounded-lg transition-colors ${note.done ? "text-emerald-400 bg-emerald-500/10" : "text-[var(--c-muted)] hover:text-emerald-400 hover:bg-emerald-500/10"}`}
              title={note.done ? "Mark undone" : "Mark as done"}>
              <MdCheckCircle size={15} />
            </button>
          )}
          {canPin && onTogglePin && (
            <button onClick={e => { e.stopPropagation(); onTogglePin(); }}
              className={`p-1.5 rounded-lg transition-colors ${note.pinned ? "text-amber-400 bg-amber-500/10 rotate-45" : "text-[var(--c-muted)] hover:text-amber-400 hover:bg-amber-500/10"}`}
              title={note.pinned ? "Unpin" : "Pin"}>
              <MdPushPin size={15} />
            </button>
          )}
          <button onClick={copyContent}
            className={`p-1.5 rounded-lg transition-colors ${copied ? "text-emerald-400" : "text-[var(--c-muted)] hover:text-cyan-400 hover:bg-cyan-500/10"}`}
            title="Copy">
            {copied ? <MdCheck size={15} /> : <MdContentCopy size={15} />}
          </button>
          {onPreview && (
            <button onClick={e => { e.stopPropagation(); onPreview(); }}
              className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-violet-400 hover:bg-violet-500/10 transition-colors" title="Preview">
              <MdFullscreen size={15} />
            </button>
          )}
          {canEdit && onEdit && (
            <button onClick={e => { e.stopPropagation(); onEdit(); }}
              className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors" title="Edit">
              <MdEdit size={15} />
            </button>
          )}
          {canHide && onToggleHide && (
            <button onClick={e => { e.stopPropagation(); onToggleHide(); }}
              className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
              title={note.hidden ? "Show" : "Hide"}>
              {note.hidden ? <MdVisibility size={15} /> : <MdVisibilityOff size={15} />}
            </button>
          )}
          {canDelete && onDelete && (
            <button onClick={e => { e.stopPropagation(); onDelete(); }}
              className="p-1.5 rounded-lg text-[var(--c-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
              <MdDelete size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
