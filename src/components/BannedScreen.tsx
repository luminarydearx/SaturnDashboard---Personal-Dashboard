"use client";

import { useEffect, useRef, useState } from "react";
import { PublicUser } from "@/types";
import { MdEmail } from "react-icons/md";
import { FaPhoneAlt } from "react-icons/fa";
import { getOwnerEmail, getOwnerPhone } from "@/lib/getOwner";

const ROLE_COLORS: Record<string, string> = {
  owner:     "#fbbf24",
  "co-owner":"#f97316",
  admin:     "#22d3ee",
  developer: "#a78bfa",
  user:      "#94a3b8",
};

function Starfield() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const COLORS = ["#ff6666","#ff4444","#ff8888","#ffaaaa","#ff2222"];
    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * window.innerWidth, y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.3, a: Math.random(), da: (Math.random() - 0.5) * 0.006,
      vx: (Math.random() - 0.5) * 0.2, vy: (Math.random() - 0.5) * 0.2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
    }));
    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const s of stars) {
        s.a += s.da; if (s.a <= 0 || s.a >= 1) s.da *= -1;
        s.x += s.vx; s.y += s.vy;
        if (s.x < 0) s.x = canvas.width; if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height; if (s.y > canvas.height) s.y = 0;
        ctx.globalAlpha = s.a; ctx.fillStyle = s.color;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />;
}

function WarningRings() {
  return (
    <div className="relative flex items-center justify-center w-28 h-28 flex-shrink-0">
      <div className="absolute inset-0 rounded-full border border-red-500/20 animate-ping" style={{ animationDuration: "3s" }} />
      <div className="absolute w-28 h-28 rounded-full border-2 border-red-500/30 animate-spin" style={{ animationDuration: "12s" }} />
      <div className="absolute w-20 h-20 rounded-full border border-red-400/20 animate-spin" style={{ animationDuration: "8s", animationDirection: "reverse" }} />
      <div className="absolute w-14 h-14 rounded-full border border-orange-400/30 animate-spin" style={{ animationDuration: "5s" }} />
      <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-red-700/40 to-red-900/40 border-2 border-red-500/60 flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.5)]">
        <svg viewBox="0 0 24 24" className="w-5 h-5 text-red-400" fill="currentColor">
          <path d="M12 2L1 21h22L12 2zm0 3.5L20.5 19h-17L12 5.5zm-1 5v5h2v-5h-2zm0 7v2h2v-2h-2z"/>
        </svg>
      </div>
    </div>
  );
}

interface BannedScreenProps { user: PublicUser }

export default function BannedScreen({ user }: BannedScreenProps) {
  const ownerEmail = getOwnerEmail();
  const ownerPhone = getOwnerPhone();
  const [mounted, setMounted] = useState(false);
  const [glitch,  setGlitch]  = useState(false);
  useEffect(() => {
    setMounted(true);
    const t = setInterval(() => { setGlitch(true); setTimeout(() => setGlitch(false), 150); }, 3000 + Math.random() * 2000);
    return () => clearInterval(t);
  }, []);

  const bannedByColor = ROLE_COLORS[(user as any).bannedByRole || "user"] || "#94a3b8";

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center overflow-y-auto"
      style={{ background: "radial-gradient(ellipse at center, #1a0005 0%, #0a0002 50%, #000000 100%)" }}>
      {mounted && <Starfield />}

      {/* Nebula */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-red-900/15 blur-3xl animate-pulse" style={{ animationDuration: "4s" }} />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-orange-900/10 blur-3xl animate-pulse" style={{ animationDuration: "6s", animationDelay: "2s" }} />
      </div>

      {/* Scanlines */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,0,0,0.015) 2px, rgba(255,0,0,0.015) 4px)" }} />

      {/* Content */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center gap-5">
        <WarningRings />

        {/* Title */}
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-px flex-1 bg-gradient-to-r from-transparent to-red-500/50" />
            <span className="text-red-500/60 text-[10px] font-mono tracking-[0.4em] uppercase">System Alert</span>
            <div className="h-px flex-1 bg-gradient-to-l from-transparent to-red-500/50" />
          </div>
          <h1 className={`font-orbitron text-3xl sm:text-5xl font-black uppercase tracking-widest ${glitch ? "opacity-80 blur-[1px]" : ""}`}
            style={{ color: "#ff4444", textShadow: "0 0 40px rgba(255,68,68,0.7), 0 0 80px rgba(255,68,68,0.4)", transition: "all 0.05s" }}>
            ACCESS DENIED
          </h1>
          <p className="text-red-400/60 font-mono text-xs sm:text-sm mt-2 tracking-widest">ORBIT CLEARANCE REVOKED</p>
        </div>

        {/* Account info */}
        <div className="w-full rounded-2xl overflow-hidden"
          style={{ background: "rgba(20,0,0,0.75)", border: "1px solid rgba(239,68,68,0.25)", backdropFilter: "blur(16px)" }}>
          {/* Header */}
          <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: "rgba(239,68,68,0.15)", background: "rgba(239,68,68,0.05)" }}>
            <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-red-400 font-bold font-orbitron">{user.username[0].toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm truncate">@{user.username}</p>
              <p className="text-red-400/70 text-xs font-mono">{user.displayName || user.username}</p>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-[10px] font-bold uppercase tracking-wider">Banned</span>
            </div>
          </div>

          {/* Banned by */}
          {((user as any).bannedByDisplayName || user.bannedBy) && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
              <p className="text-red-400/50 text-[10px] uppercase tracking-widest font-bold mb-1.5">Banned By</p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold"
                  style={{ background: `${bannedByColor}20`, border: `1px solid ${bannedByColor}40`, color: bannedByColor }}>
                  {((user as any).bannedByDisplayName || "?")[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-red-200/80 text-sm font-semibold">
                    {(user as any).bannedByDisplayName || "Administrator"}
                    {' '}
                    <span className="text-red-400/50 text-xs font-mono">
                      (@{user.bannedBy || "admin"})
                    </span>
                  </p>
                  {(user as any).bannedByRole && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color: bannedByColor, background: `${bannedByColor}15`, border: `1px solid ${bannedByColor}30` }}>
                      {(user as any).bannedByRole}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Reason */}
          {user.bannedReason && (
            <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(239,68,68,0.15)" }}>
              <p className="text-red-400/50 text-[10px] uppercase tracking-widest font-bold mb-1">Reason</p>
              <p className="text-red-200/80 text-sm font-mono leading-relaxed break-words">{user.bannedReason}</p>
            </div>
          )}

          {/* Date */}
          {user.bannedAt && (
            <div className="px-4 py-3">
              <p className="text-red-400/50 text-[10px] uppercase tracking-widest font-bold mb-1">Banned At</p>
              <p className="text-slate-400 text-xs font-mono">
                {new Date(user.bannedAt).toLocaleDateString("id-ID", { dateStyle: "full" })}
              </p>
            </div>
          )}
        </div>

        {/* Contact */}
        <div className="w-full rounded-2xl overflow-hidden"
          style={{ background: "rgba(10,10,20,0.8)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)" }}>
          <div className="px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Contact Command</p>
          </div>
          <div className="p-4 space-y-2.5">
            <p className="text-slate-500 text-xs">To appeal, contact the administrator:</p>
            <a href={`mailto:${ownerEmail}`} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
              style={{ background: "rgba(6,182,212,0.05)", border: "1px solid rgba(6,182,212,0.15)" }}>
              <MdEmail className="text-cyan-400 text-xl flex-shrink-0" />
              <span className="text-slate-300 font-mono text-sm break-all">{ownerEmail}</span>
            </a>
            <a href={`tel:${ownerPhone}`} className="flex items-center gap-3 px-4 py-3 rounded-xl transition-colors"
              style={{ background: "rgba(139,92,246,0.05)", border: "1px solid rgba(139,92,246,0.15)" }}>
              <FaPhoneAlt className="text-violet-400 text-lg flex-shrink-0" />
              <span className="text-slate-300 font-mono text-sm">{ownerPhone}</span>
            </a>
          </div>
        </div>

        {/* Sign out */}
        <form action="/api/auth/logout" method="POST" className="w-full">
          <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm transition-all"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", color: "#f87171" }}>
            <span className="flex items-center justify-center gap-2">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
              </svg>
              Sign Out
            </span>
          </button>
        </form>

        <p className="text-slate-800 text-[10px] font-mono text-center tracking-wider pb-2">
          SATURN DASHBOARD · ACCESS CONTROL SYSTEM
        </p>
      </div>
    </div>
  );
}
