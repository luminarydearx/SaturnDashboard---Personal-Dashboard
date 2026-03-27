"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MdQrCode2, MdDownload, MdClose, MdWarning, MdCheckCircle } from "react-icons/md";
import QRCodeDisplay from "@/components/ui/QRCodeDisplay";

interface Props {
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
    role: string;
    email?: string;
  };
  onClose: () => void;
}

const AUTO_CLOSE = 10; // seconds

export default function QRSuccessModal({ user, onClose }: Props) {
  const [countdown, setCountdown] = useState(AUTO_CLOSE);
  const [qrUrl,     setQrUrl]     = useState("");
  const [paused,    setPaused]    = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      if (paused) return;
      setCountdown(prev => {
        if (prev <= 1) { onClose(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [paused, onClose]);

  // Pause timer when user hovers over modal
  const handleMouseEnter = () => setPaused(true);
  const handleMouseLeave = () => setPaused(false);

  const progress = (countdown / AUTO_CLOSE) * 100;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.85, y: 30 }}
          animate={{ opacity: 1, scale: 1,    y: 0  }}
          exit={{    opacity: 0, scale: 0.9,  y: 20 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          className="w-full max-w-md rounded-3xl overflow-hidden shadow-2xl flex flex-col"
          style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}
        >
          {/* Progress bar */}
          <div className="h-1 w-full" style={{ background: "var(--c-border)" }}>
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg,#7c3aed,#06b6d4)", width: `${progress}%` }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center gap-3 px-6 py-4 border-b"
            style={{ borderColor: "var(--c-border)", background: "rgba(var(--c-accent-rgb),.04)" }}>
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)" }}>
              <MdCheckCircle size={22} style={{ color: "#4ade80" }} />
            </motion.div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-[var(--c-text)]">Akun Berhasil Dibuat! 🎉</p>
              <p className="text-xs" style={{ color: "var(--c-muted)" }}>
                QR Code untuk <strong>{user.displayName}</strong> tersedia di bawah
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-mono font-bold px-2 py-1 rounded-lg"
                style={{ background: paused ? "rgba(var(--c-accent-rgb),.1)" : "rgba(239,68,68,.1)", color: paused ? "var(--c-accent)" : "#f87171", border: paused ? "1px solid rgba(var(--c-accent-rgb),.3)" : "1px solid rgba(239,68,68,.3)" }}>
                {paused ? "⏸" : `${countdown}s`}
              </span>
              <button onClick={onClose}
                className="w-8 h-8 rounded-xl flex items-center justify-center transition-colors"
                style={{ color: "var(--c-muted)", background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                <MdClose size={15} />
              </button>
            </div>
          </div>

          {/* QR Code */}
          <div className="p-6 flex flex-col items-center gap-4">
            <QRCodeDisplay
              userId={user.id}
              username={user.username}
              displayName={user.displayName}
              avatar={user.avatar}
              size={240}
              onGenerated={setQrUrl}
            />

            {/* Warning */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="w-full flex items-start gap-3 px-4 py-3 rounded-2xl"
              style={{ background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.25)" }}>
              <MdWarning size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400 mb-0.5">⚠️ Jaga Kerahasiaan QR Code ini</p>
                <p className="text-[11px] leading-relaxed" style={{ color: "var(--c-muted)" }}>
                  QR Code ini memungkinkan siapa pun yang memilikinya untuk langsung masuk ke akun <strong className="text-[var(--c-text)]">{user.displayName}</strong>.
                  Jangan bagikan kepada siapapun selain pemiliknya.
                </p>
              </div>
            </motion.div>

            {/* User info */}
            <div className="w-full flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-bold">
                {user.avatar
                  ? <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  : (user.displayName || user.username)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[var(--c-text)] truncate">{user.displayName}</p>
                <p className="text-xs capitalize" style={{ color: "var(--c-muted)" }}>@{user.username} · {user.role}</p>
              </div>
              <MdQrCode2 size={18} style={{ color: "var(--c-accent)" }} />
            </div>

            <p className="text-[10px] text-center" style={{ color: "var(--c-muted)", opacity: 0.5 }}>
              {paused ? "Timer dijeda — hover keluar untuk melanjutkan" : `Modal ini akan tutup otomatis dalam ${countdown} detik`}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
