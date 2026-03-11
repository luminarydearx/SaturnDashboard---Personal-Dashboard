"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { MdWarning, MdInfo, MdCheckCircle } from "react-icons/md";

interface ConfirmModalProps {
  isOpen: boolean;              // ✅ Wajib
  title: string;                // ✅ Wajib
  message: string;              // ✅ Wajib
  confirmText?: string;         // ✅ Opsional (default: "Confirm")
  cancelText?: string;          // ✅ Opsional (default: "Cancel")
  type?: "danger" | "warning" | "info" | "success";  // ✅ Opsional (default: "danger")
  onConfirm: () => void;        // ✅ Wajib
  onCancel: () => void;         // ✅ Wajib
  isLoading?: boolean;          // ✅ Opsional
}

const ICONS = { danger: MdWarning, warning: MdWarning, info: MdInfo, success: MdCheckCircle };
const COLORS = {
  danger:  { bg: "bg-red-500/10",    border: "border-red-500/30",    icon: "text-red-500",    btn: "bg-red-600 hover:bg-red-500" },
  warning: { bg: "bg-amber-500/10",  border: "border-amber-500/30",  icon: "text-amber-500",  btn: "bg-amber-600 hover:bg-amber-500" },
  info:    { bg: "bg-blue-500/10",   border: "border-blue-500/30",   icon: "text-blue-500",   btn: "bg-blue-600 hover:bg-blue-500" },
  success: { bg: "bg-emerald-500/10",border: "border-emerald-500/30",icon: "text-emerald-500",btn: "bg-emerald-600 hover:bg-emerald-500" },
};

export default function ConfirmModal({
  isOpen, title, message, confirmText = "Confirm", cancelText = "Cancel",
  type = "danger", onConfirm, onCancel, isLoading = false,
}: ConfirmModalProps) {
  const clr = COLORS[type];
  const Icon = ICONS[type];

  // Enter = confirm, Escape = cancel
  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !isLoading)  { e.preventDefault(); onConfirm(); }
      if (e.key === "Escape" && !isLoading) { e.preventDefault(); onCancel(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [isOpen, isLoading, onConfirm, onCancel]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" style={{ zIndex: 9998 }}
            onClick={() => !isLoading && onCancel()} />
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none p-4" style={{ zIndex: 9999 }}>
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
              style={{ background: "var(--c-surface)", border: `1px solid rgba(var(--confirm-border), 0.3)` }}>
              <div className="p-6 text-center">
                <div className={`mx-auto w-14 h-14 rounded-full ${clr.bg} border ${clr.border} flex items-center justify-center mb-4`}>
                  <Icon className={clr.icon} size={30} />
                </div>
                <h3 className="text-xl font-bold text-[var(--c-text)]">{title}</h3>
                <p className="text-sm text-[var(--c-muted)] mt-2 font-nunito">{message}</p>
                <p className="text-[10px] text-[var(--c-muted)] opacity-40 mt-3 font-mono">Enter = {confirmText} · Esc = {cancelText}</p>
              </div>
              <div className="flex p-4 gap-3" style={{ background: "rgba(0,0,0,0.1)" }}>
                <button onClick={onCancel} disabled={isLoading}
                  className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[var(--c-text)] hover:opacity-80 transition disabled:opacity-30"
                  style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>
                  {cancelText}
                </button>
                <button onClick={onConfirm} disabled={isLoading}
                  className={`flex-1 py-2.5 rounded-xl font-bold text-sm text-white transition ${clr.btn} disabled:opacity-50`}>
                  {isLoading ? "…" : confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
