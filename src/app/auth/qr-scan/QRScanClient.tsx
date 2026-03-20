"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import StarBackground from "@/components/StarBackground";
import {
  MdQrCode2, MdLogin, MdError, MdCheckCircle,
  MdCameraAlt, MdUpload, MdArrowBack, MdClose, MdFlipCameraAndroid,
} from "react-icons/md";

const ROLE_BADGE: Record<string, string> = {
  owner:      "bg-purple-500/20 text-purple-300 border-purple-500/40",
  "co-owner": "bg-violet-500/20 text-violet-300 border-violet-500/40",
  admin:      "bg-blue-500/20 text-blue-300 border-blue-500/40",
  developer:  "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
  user:       "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

declare global {
  interface Window {
    jsQR?: (data: Uint8ClampedArray, w: number, h: number, opts?: { inversionAttempts?: string }) => { data: string } | null;
  }
}

async function loadJsQR(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (window.jsQR) return true;
  return new Promise(resolve => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

function extractToken(raw: string): string | null {
  if (!raw) return null;
  try { return new URL(raw).searchParams.get("token"); } catch {}
  if (raw.length > 8 && /^[a-zA-Z0-9_-]+$/.test(raw)) return raw;
  return null;
}

async function decodeCanvas(canvas: HTMLCanvasElement, w: number, h: number): Promise<string | null> {
  await loadJsQR();
  if (!window.jsQR) return null;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.getImageData(0, 0, w, h);
  const r1 = window.jsQR(img.data, w, h, { inversionAttempts: "attemptBoth" });
  if (r1?.data) return extractToken(r1.data);
  // 2x upscale
  const big = document.createElement("canvas");
  big.width = w * 2; big.height = h * 2;
  const bc = big.getContext("2d")!;
  bc.drawImage(canvas, 0, 0, w * 2, h * 2);
  const bi = bc.getImageData(0, 0, w * 2, h * 2);
  const r2 = window.jsQR(bi.data, w * 2, h * 2, { inversionAttempts: "attemptBoth" });
  if (r2?.data) return extractToken(r2.data);
  return null;
}

async function decodeImage(el: HTMLImageElement): Promise<string | null> {
  const c = document.createElement("canvas");
  c.width = el.naturalWidth; c.height = el.naturalHeight;
  c.getContext("2d")!.drawImage(el, 0, 0);
  return decodeCanvas(c, c.width, c.height);
}

async function validateToken(t: string) {
  const r = await fetch(`/api/auth/qr-login?token=${encodeURIComponent(t)}`);
  return r.json();
}

async function loginWithToken(t: string) {
  const r = await fetch("/api/auth/qr-login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: t }),
  });
  return r.json();
}

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const urlToken = sp.get("token") || "";
  const isPrompt = sp.get("prompt") === "1";

  type Mode = "prompt"|"loading"|"valid"|"logging-in"|"done"|"invalid"|"camera"|"scanning";
  const [mode,   setMode]   = useState<Mode>(urlToken ? "loading" : isPrompt ? "prompt" : "invalid");
  const [user,   setUser]   = useState<any>(null);
  const [err,    setErr]    = useState("");
  const [token,  setToken]  = useState(urlToken);
  const [drag,   setDrag]   = useState(false);
  const [facingUser, setFacingUser] = useState(false); // back cam by default

  const fileRef   = useRef<HTMLInputElement>(null);
  const videoRef  = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef    = useRef<number>(0);
  const scanning  = useRef(false);

  const handleToken = useCallback(async (t: string) => {
    scanning.current = false;
    stopCamera();
    setToken(t);
    setMode("loading");
    try {
      const d = await validateToken(t);
      if (d.success) { setUser(d.user); setMode("valid"); }
      else { setErr(d.error || "QR tidak valid"); setMode("invalid"); }
    } catch { setErr("Gagal koneksi"); setMode("invalid"); }
  }, []); // eslint-disable-line

  useEffect(() => { if (urlToken) handleToken(urlToken); }, [urlToken, handleToken]);
  useEffect(() => () => stopCamera(), []);

  const doLogin = useCallback(async () => {
    setMode("logging-in");
    try {
      const d = await loginWithToken(token);
      if (d.success) { setMode("done"); setTimeout(() => router.push("/dashboard"), 1400); }
      else { setErr(d.error || "Login gagal"); setMode("invalid"); }
    } catch { setErr("Gagal koneksi"); setMode("invalid"); }
  }, [token, router]);

  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async (facing: boolean) => {
    setErr(""); setMode("camera");
    stopCamera();
    // Check if mobile (has multiple cameras)
    const isMobile = /Android|iPhone|iPad/i.test(navigator.userAgent);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facing ? "user" : (isMobile ? "environment" : "user"),
          width: { ideal: 1280 }, height: { ideal: 720 },
        },
      });
      streamRef.current = stream;
      const v = videoRef.current!;
      v.srcObject = stream;
      await v.play();
      scanning.current = true;
      const canvas = canvasRef.current!;

      const tick = async () => {
        if (!scanning.current) return;
        if (v.readyState >= 2 && v.videoWidth > 0) {
          canvas.width = v.videoWidth; canvas.height = v.videoHeight;
          canvas.getContext("2d")!.drawImage(v, 0, 0);
          const t = await decodeCanvas(canvas, canvas.width, canvas.height);
          if (t) { handleToken(t); return; }
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    } catch {
      setErr("Kamera tidak bisa diakses. Gunakan Upload Gambar.");
      setMode("prompt");
    }
  };

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) { setErr("File harus berupa gambar"); return; }
    setMode("scanning"); setErr("");
    try {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
      const t = await decodeImage(img);
      URL.revokeObjectURL(img.src);
      if (t) await handleToken(t);
      else { setErr("QR Code tidak terdeteksi. Pastikan gambar jelas, pencahayaan cukup, dan QR tidak tertutup."); setMode("prompt"); }
    } catch { setErr("Gagal membaca gambar."); setMode("prompt"); }
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ── Card wrapper ──────────────────────────────────────────────────────────
  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarBackground />
      <motion.div initial={{ opacity: 0, y: 20, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16,1,0.3,1] }}
        className="relative z-10 w-full max-w-sm">
        <div className="rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "rgba(13,13,22,.97)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-3 px-6 pt-7 pb-4">
            <motion.div animate={{ rotate: [0,10,-10,0] }} transition={{ duration: 4, repeat: Infinity }}
              className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,.3),rgba(6,182,212,.2))", border: "1px solid rgba(124,58,237,.3)" }}>
              <MdQrCode2 size={22} style={{ color: "#a78bfa" }} />
            </motion.div>
            <div>
              <h1 className="font-bold text-white text-lg">QR Login</h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>Saturn Dashboard</p>
            </div>
          </div>
          <div className="px-6 pb-7">{children}</div>
        </div>
      </motion.div>
      <canvas ref={canvasRef} style={{ display: "none" }} />
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
    </div>
  );

  // ── PROMPT ─────────────────────────────────────────────────────────────────
  if (mode === "prompt" || mode === "scanning") {
    return (
      <Card>
        <AnimatePresence mode="wait">
          <motion.div key="prompt" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-4">
            <p className="text-sm text-center" style={{ color: "rgba(255,255,255,.5)" }}>Pilih cara scan QR Code</p>
            {err && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
                className="px-3 py-2.5 rounded-xl text-xs text-center"
                style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#fca5a5" }}>
                {err}
              </motion.div>
            )}
            <motion.button whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
              onClick={() => startCamera(facingUser)}
              className="w-full py-4 rounded-2xl font-bold text-white flex flex-col items-center gap-2"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,.25),rgba(6,182,212,.15))", border: "1px solid rgba(124,58,237,.35)", touchAction: "manipulation" }}>
              <MdCameraAlt size={28} />
              <span>Gunakan Kamera</span>
              <span className="text-xs font-normal opacity-60">Arahkan kamera ke QR Code</span>
            </motion.button>

            {/* Drag & Drop / Upload */}
            <motion.div
              onDragOver={e => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              onClick={() => fileRef.current?.click()}
              whileHover={{ scale: 1.02, y: -2 }} whileTap={{ scale: 0.98 }}
              animate={{ borderColor: drag ? "rgba(124,58,237,.7)" : "rgba(255,255,255,.12)", background: drag ? "rgba(124,58,237,.1)" : "rgba(255,255,255,.05)" }}
              className="w-full py-5 rounded-2xl font-bold flex flex-col items-center gap-2 cursor-pointer"
              style={{ border: "2px dashed rgba(255,255,255,.12)", color: drag ? "#a78bfa" : "rgba(255,255,255,.7)", transition: "all .2s" }}>
              <MdUpload size={28} />
              <span>{mode === "scanning" ? "Membaca QR…" : drag ? "Lepaskan di sini!" : "Upload / Drag & Drop"}</span>
              <span className="text-xs font-normal opacity-50">Klik atau seret gambar QR Code ke sini</span>
            </motion.div>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/login")}
              className="flex items-center justify-center gap-1.5 text-sm py-2" style={{ color: "rgba(255,255,255,.3)" }}>
              <MdArrowBack size={14} /> Kembali ke Login
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </Card>
    );
  }

  // ── CAMERA ─────────────────────────────────────────────────────────────────
  if (mode === "camera") {
    const isMobile = typeof navigator !== "undefined" && /Android|iPhone|iPad/i.test(navigator.userAgent);
    return (
      <div className="min-h-screen flex items-center justify-center p-0 relative" style={{ background: "#000" }}>
        <canvas ref={canvasRef} style={{ display: "none" }} />
        <button onClick={() => { scanning.current = false; stopCamera(); setMode("prompt"); }}
          className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.7)", border: "1px solid rgba(255,255,255,.2)", color: "#fff" }}>
          <MdClose size={22} />
        </button>

        {/* Camera flip (mobile only) */}
        {isMobile && (
          <button onClick={() => { const f = !facingUser; setFacingUser(f); startCamera(f); }}
            className="absolute top-4 left-4 z-20 w-11 h-11 rounded-full flex items-center justify-center"
            style={{ background: "rgba(0,0,0,.7)", border: "1px solid rgba(255,255,255,.2)", color: "#fff" }}>
            <MdFlipCameraAndroid size={22} />
          </button>
        )}

        <div className="relative w-full max-w-sm mx-auto">
          {/* Mirror for front camera (facingUser), normal for back */}
          <video ref={videoRef} playsInline muted className="w-full rounded-2xl"
            style={{ maxHeight: "70vh", objectFit: "cover", background: "#000", transform: facingUser ? "scaleX(-1)" : "none" }} />
          {/* Corner markers */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div style={{ width: 220, height: 220, position: "relative" }}>
              {[["0 0 0","tl"],["0 auto 0 0","tr"],["auto 0 0","bl"],["auto auto 0 0","br"]].map(([,k]) => (
                <div key={k} style={{
                  position: "absolute", width: 40, height: 40,
                  ...(k==="tl"?{top:0,left:0}:k==="tr"?{top:0,right:0}:k==="bl"?{bottom:0,left:0}:{bottom:0,right:0}),
                  borderTop: k.startsWith("t") ? "4px solid #a78bfa" : "none",
                  borderBottom: k.startsWith("b") ? "4px solid #a78bfa" : "none",
                  borderLeft: k.endsWith("l") ? "4px solid #a78bfa" : "none",
                  borderRight: k.endsWith("r") ? "4px solid #a78bfa" : "none",
                  borderRadius: k==="tl"?"12px 0 0 0":k==="tr"?"0 12px 0 0":k==="bl"?"0 0 0 12px":"0 0 12px 0",
                }} />
              ))}
              {/* Scan line animation */}
              <motion.div animate={{ y: [0, 200, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                style={{ position: "absolute", left: 4, right: 4, height: 2, background: "linear-gradient(90deg,transparent,#a78bfa,transparent)", borderRadius: 1 }} />
            </div>
          </div>
        </div>
        <p className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm">
          {facingUser ? "Kamera depan aktif" : "Kamera belakang aktif"} — arahkan ke QR Code
        </p>
      </div>
    );
  }

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (mode === "loading") {
    return <Card><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4 py-10">
      <div className="w-12 h-12 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
      <p className="text-sm" style={{ color: "rgba(255,255,255,.5)" }}>Memvalidasi QR…</p>
    </motion.div></Card>;
  }

  // ── INVALID ─────────────────────────────────────────────────────────────────
  if (mode === "invalid") {
    return <Card>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-6 text-center">
        <motion.div animate={{ rotate: [0, -10, 10, 0] }} transition={{ duration: 0.5 }}
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)" }}>
          <MdError size={32} style={{ color: "#f87171" }} />
        </motion.div>
        <div><p className="text-red-400 font-bold mb-1">QR Tidak Valid</p><p className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>{err}</p></div>
        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
          onClick={() => { setErr(""); setMode("prompt"); }}
          className="px-6 py-2.5 rounded-xl text-sm font-semibold"
          style={{ background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)", color: "#a78bfa" }}>
          Coba Lagi
        </motion.button>
        <button onClick={() => router.push("/login")} className="text-sm" style={{ color: "rgba(255,255,255,.25)" }}>Kembali ke Login</button>
      </motion.div>
    </Card>;
  }

  // ── VALID ───────────────────────────────────────────────────────────────────
  if ((mode === "valid" || mode === "logging-in") && user) {
    return <Card>
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-5">
        <motion.div whileHover={{ scale: 1.05 }} className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden"
            style={{ border: "3px solid rgba(124,58,237,.5)", boxShadow: "0 0 30px rgba(124,58,237,.3)" }}>
            {user.avatar
              ? <Image src={user.avatar} alt={user.displayName} width={96} height={96} className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#0891b2)" }}>
                  {(user.displayName || user.username)[0].toUpperCase()}
                </div>}
          </div>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3, type: "spring" }}
            className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2"
            style={{ background: "#22c55e", borderColor: "rgba(13,13,22,1)" }} />
        </motion.div>
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-1">{user.displayName}</h2>
          <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,.45)" }}>@{user.username}</p>
          <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full border capitalize ${ROLE_BADGE[user.role] || ROLE_BADGE.user}`}>{user.role}</span>
        </div>
        {(user.email || user.phone || user.bio) && (
          <div className="w-full rounded-2xl p-4 flex flex-col gap-2 text-sm" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
            {user.email && <div className="flex gap-3"><span className="text-[10px] w-14 flex-shrink-0" style={{ color: "rgba(255,255,255,.3)" }}>Email</span><span className="text-xs text-white truncate">{user.email}</span></div>}
            {user.phone && <div className="flex gap-3"><span className="text-[10px] w-14 flex-shrink-0" style={{ color: "rgba(255,255,255,.3)" }}>Phone</span><span className="text-xs text-white">{user.phone}</span></div>}
          </div>
        )}
        <motion.button onClick={doLogin} disabled={mode === "logging-in"}
          whileHover={{ scale: mode === "logging-in" ? 1 : 1.03 }} whileTap={{ scale: mode === "logging-in" ? 1 : 0.97 }}
          className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2.5"
          style={{ background: mode === "logging-in" ? "rgba(124,58,237,.3)" : "linear-gradient(135deg,#7c3aed,#0891b2)", boxShadow: mode === "logging-in" ? "none" : "0 8px 24px rgba(124,58,237,.4)", touchAction: "manipulation" }}>
          {mode === "logging-in"
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Masuk…</>
            : <><MdLogin size={18} />Masuk sebagai {(user.displayName || "").split(" ")[0]}</>}
        </motion.button>
        <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,.2)" }}>Scan ini akan dicatat dalam log absensi</p>
      </motion.div>
    </Card>;
  }

  // ── DONE ─────────────────────────────────────────────────────────────────────
  return <Card>
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-8 text-center">
      <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.5 }}
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)" }}>
        <MdCheckCircle size={32} style={{ color: "#4ade80" }} />
      </motion.div>
      <p className="text-green-400 font-bold">Login Berhasil!</p>
      <p className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>Mengalihkan ke Dashboard…</p>
    </motion.div>
  </Card>;
}

export default function QRScanClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#04040d" }}>
        <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
      </div>
    }>
      <Inner />
    </Suspense>
  );
}
