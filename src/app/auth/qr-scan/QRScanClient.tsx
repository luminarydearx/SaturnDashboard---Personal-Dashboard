"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import StarBackground from "@/components/StarBackground";
import {
  MdQrCode2, MdLogin, MdError, MdCheckCircle,
  MdCameraAlt, MdUpload, MdClose, MdArrowBack,
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
  if (window.jsQR) return true;
  return new Promise(resolve => {
    const s = document.createElement("script");
    s.src    = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
    s.onload  = () => resolve(true);
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

async function decodeImageToToken(imageEl: HTMLImageElement | HTMLVideoElement, width: number, height: number): Promise<string | null> {
  const ok = await loadJsQR();
  if (!ok || !window.jsQR) return null;

  const canvas = document.createElement("canvas");
  canvas.width  = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(imageEl, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);

  // jsQR with dontInvert — standard black on white
  const r1 = window.jsQR(imageData.data, width, height, { inversionAttempts: "dontInvert" });
  if (r1?.data) return extractToken(r1.data);

  // jsQR with attemptBoth — tries both normal and inverted
  const r2 = window.jsQR(imageData.data, width, height, { inversionAttempts: "attemptBoth" });
  if (r2?.data) return extractToken(r2.data);

  // Try with larger upscaled canvas (helps with small/blurry QRs)
  const scale = 2;
  const big = document.createElement("canvas");
  big.width  = width * scale;
  big.height = height * scale;
  big.getContext("2d")!.drawImage(imageEl, 0, 0, width * scale, height * scale);
  const bigData = big.getContext("2d")!.getImageData(0, 0, width * scale, height * scale);
  const r3 = window.jsQR(bigData.data, width * scale, height * scale, { inversionAttempts: "attemptBoth" });
  if (r3?.data) return extractToken(r3.data);

  return null;
}

async function validateToken(token: string) {
  const r = await fetch(`/api/auth/qr-login?token=${encodeURIComponent(token)}`);
  return r.json();
}

async function loginWithToken(token: string) {
  const r = await fetch("/api/auth/qr-login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return r.json();
}

// ── Inner component (uses useSearchParams) ───────────────────────────────────
function Inner() {
  const sp     = useSearchParams();
  const router = useRouter();
  const token  = sp.get("token") || "";
  const prompt = sp.get("prompt") === "1";

  type Mode = "prompt" | "loading" | "valid" | "logging-in" | "done" | "invalid" | "camera" | "scanning-file";
  const [mode,   setMode]   = useState<Mode>(token ? "loading" : prompt ? "prompt" : "invalid");
  const [user,   setUser]   = useState<any>(null);
  const [error,  setError]  = useState("");
  const [active, setActive] = useState(token);

  const fileRef    = useRef<HTMLInputElement>(null);
  const videoRef   = useRef<HTMLVideoElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const rafRef     = useRef<number>(0);
  const scanActive = useRef(false);

  // ── Validate token ─────────────────────────────────────────────────────────
  const handleToken = useCallback(async (t: string) => {
    scanActive.current = false;
    stopCamera();
    setActive(t);
    setMode("loading");
    try {
      const d = await validateToken(t);
      if (d.success) { setUser(d.user); setMode("valid"); }
      else           { setError(d.error || "QR tidak valid"); setMode("invalid"); }
    } catch { setError("Gagal koneksi"); setMode("invalid"); }
  }, []); // eslint-disable-line

  useEffect(() => {
    if (token) handleToken(token);
  }, [token, handleToken]);

  // ── Login ─────────────────────────────────────────────────────────────────
  const doLogin = useCallback(async () => {
    setMode("logging-in");
    try {
      const d = await loginWithToken(active);
      if (d.success) { setMode("done"); setTimeout(() => router.push("/dashboard"), 1400); }
      else           { setError(d.error || "Login gagal"); setMode("invalid"); }
    } catch { setError("Gagal koneksi"); setMode("invalid"); }
  }, [active, router]);

  // ── Camera ────────────────────────────────────────────────────────────────
  const stopCamera = () => {
    cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  const startCamera = async () => {
    setError("");
    setMode("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      scanActive.current = true;

      const scan = async () => {
        if (!scanActive.current) return;
        if (video.readyState >= 2) {
          const t = await decodeImageToToken(video, video.videoWidth, video.videoHeight);
          if (t) { handleToken(t); return; }
        }
        rafRef.current = requestAnimationFrame(scan);
      };
      requestAnimationFrame(scan);
    } catch {
      setError("Kamera tidak bisa diakses. Gunakan Upload Gambar.");
      setMode("prompt");
    }
  };

  useEffect(() => () => stopCamera(), []);

  // ── File upload ───────────────────────────────────────────────────────────
  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMode("scanning-file");
    setError("");
    try {
      const img = new window.Image();
      img.src = URL.createObjectURL(file);
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
      const t = await decodeImageToToken(img, img.naturalWidth, img.naturalHeight);
      URL.revokeObjectURL(img.src);
      if (t) await handleToken(t);
      else {
        setError("QR Code tidak terdeteksi. Pastikan QR dalam kondisi baik, pencahayaan cukup, dan tidak terlalu kecil.");
        setMode("prompt");
      }
    } catch { setError("Gagal membaca gambar."); setMode("prompt"); }
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Card wrapper ──────────────────────────────────────────────────────────
  const Card = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen flex items-center justify-center p-4 relative">
      <StarBackground />
      <div className="relative z-10 w-full max-w-sm">
        <div className="rounded-3xl overflow-hidden shadow-2xl"
          style={{ background: "rgba(13,13,22,.97)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-3 px-6 pt-7 pb-4">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg,rgba(124,58,237,.3),rgba(6,182,212,.2))", border: "1px solid rgba(124,58,237,.3)" }}>
              <MdQrCode2 size={22} style={{ color: "#a78bfa" }} />
            </div>
            <div>
              <h1 className="font-bold text-white text-lg">QR Login</h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>Saturn Dashboard</p>
            </div>
          </div>
          <div className="px-6 pb-7">{children}</div>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );

  // ── PROMPT ─────────────────────────────────────────────────────────────────
  if (mode === "prompt" || mode === "scanning-file") {
    return (
      <Card>
        <div className="flex flex-col gap-4">
          <p className="text-sm text-center" style={{ color: "rgba(255,255,255,.5)" }}>
            Pilih cara scan QR Code
          </p>
          {error && (
            <div className="px-3 py-2.5 rounded-xl text-xs text-center"
              style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", color: "#fca5a5" }}>
              {error}
            </div>
          )}
          <button onClick={startCamera}
            className="w-full py-4 rounded-2xl font-bold text-white flex flex-col items-center gap-2"
            style={{ background: "linear-gradient(135deg,rgba(124,58,237,.25),rgba(6,182,212,.15))", border: "1px solid rgba(124,58,237,.35)", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>
            <MdCameraAlt size={28} />
            <span>Gunakan Kamera</span>
            <span className="text-xs font-normal opacity-60">Arahkan kamera ke QR Code</span>
          </button>
          <button onClick={() => fileRef.current?.click()} disabled={mode === "scanning-file"}
            className="w-full py-4 rounded-2xl font-bold flex flex-col items-center gap-2"
            style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)", color: "rgba(255,255,255,.8)", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>
            <MdUpload size={28} />
            <span>{mode === "scanning-file" ? "Membaca QR…" : "Upload Gambar QR"}</span>
            <span className="text-xs font-normal opacity-50">Pilih file PNG/JPG dari galeri</span>
          </button>
          <button onClick={() => router.push("/")} className="flex items-center justify-center gap-1.5 text-sm py-2" style={{ color: "rgba(255,255,255,.3)" }}>
            <MdArrowBack size={14} /> Kembali ke Login
          </button>
        </div>
      </Card>
    );
  }

  // ── CAMERA ─────────────────────────────────────────────────────────────────
  if (mode === "camera") {
    return (
      <div className="min-h-screen flex items-center justify-center p-0 relative bg-black">
        <button onClick={() => { scanActive.current = false; stopCamera(); setMode("prompt"); }}
          className="absolute top-4 right-4 z-20 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "rgba(0,0,0,.7)", border: "1px solid rgba(255,255,255,.2)", color: "#fff" }}>
          <MdClose size={22} />
        </button>
        <div className="relative w-full max-w-sm mx-auto px-4">
          <video ref={videoRef} playsInline muted className="w-full rounded-2xl"
            style={{ maxHeight: "65vh", objectFit: "cover", background: "#000" }} />
          {/* Corner markers */}
          <div className="absolute inset-4 pointer-events-none flex items-center justify-center">
            <div style={{ width: 220, height: 220, position: "relative" }}>
              {[["top-0 left-0","border-t-4 border-l-4 rounded-tl-xl"],["top-0 right-0","border-t-4 border-r-4 rounded-tr-xl"],["bottom-0 left-0","border-b-4 border-l-4 rounded-bl-xl"],["bottom-0 right-0","border-b-4 border-r-4 rounded-br-xl"]].map(([pos,cls]) => (
                <div key={pos} className={`absolute w-10 h-10 ${pos} ${cls}`} style={{ borderColor: "#a78bfa" }} />
              ))}
            </div>
          </div>
        </div>
        <p className="absolute bottom-8 left-0 right-0 text-center text-white/60 text-sm">Arahkan QR Code ke dalam bingkai</p>
      </div>
    );
  }

  // ── LOADING ─────────────────────────────────────────────────────────────────
  if (mode === "loading") {
    return <Card><div className="flex flex-col items-center gap-4 py-10"><div className="w-12 h-12 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" /><p className="text-sm" style={{ color: "rgba(255,255,255,.5)" }}>Memvalidasi QR…</p></div></Card>;
  }

  // ── INVALID ─────────────────────────────────────────────────────────────────
  if (mode === "invalid") {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(239,68,68,.15)", border: "1px solid rgba(239,68,68,.3)" }}>
            <MdError size={32} style={{ color: "#f87171" }} />
          </div>
          <div><p className="text-red-400 font-bold mb-1">QR Tidak Valid</p><p className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>{error}</p></div>
          <button onClick={() => { setError(""); setMode("prompt"); }} className="px-5 py-2.5 rounded-xl text-sm font-semibold" style={{ background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)", color: "#a78bfa" }}>Coba Lagi</button>
          <button onClick={() => router.push("/")} className="text-sm" style={{ color: "rgba(255,255,255,.25)" }}>Kembali ke Login</button>
        </div>
      </Card>
    );
  }

  // ── VALID ───────────────────────────────────────────────────────────────────
  if ((mode === "valid" || mode === "logging-in") && user) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden" style={{ border: "3px solid rgba(124,58,237,.5)", boxShadow: "0 0 30px rgba(124,58,237,.3)" }}>
              {user.avatar
                ? <Image src={user.avatar} alt={user.displayName} width={96} height={96} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white" style={{ background: "linear-gradient(135deg,#7c3aed,#0891b2)" }}>{(user.displayName||user.username)[0].toUpperCase()}</div>}
            </div>
            <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full border-2" style={{ background: "#22c55e", borderColor: "rgba(13,13,22,1)" }} />
          </div>
          <div className="text-center">
            <h2 className="text-xl font-bold text-white mb-1">{user.displayName}</h2>
            <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,.45)" }}>@{user.username}</p>
            <span className={`inline-block text-[11px] font-bold px-3 py-1 rounded-full border capitalize ${ROLE_BADGE[user.role]||ROLE_BADGE.user}`}>{user.role}</span>
          </div>
          {(user.email || user.phone || user.bio) && (
            <div className="w-full rounded-2xl p-4 flex flex-col gap-2" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
              {user.email && <div className="flex gap-3"><span className="text-[10px] w-14 flex-shrink-0" style={{ color: "rgba(255,255,255,.3)" }}>Email</span><span className="text-xs text-white truncate">{user.email}</span></div>}
              {user.phone && <div className="flex gap-3"><span className="text-[10px] w-14 flex-shrink-0" style={{ color: "rgba(255,255,255,.3)" }}>Phone</span><span className="text-xs text-white">{user.phone}</span></div>}
              {user.bio   && <div className="flex gap-3"><span className="text-[10px] w-14 flex-shrink-0" style={{ color: "rgba(255,255,255,.3)" }}>Bio</span><span className="text-xs text-white line-clamp-2">{user.bio}</span></div>}
            </div>
          )}
          <button onClick={doLogin} disabled={mode === "logging-in"}
            className="w-full py-3.5 rounded-2xl font-bold text-white flex items-center justify-center gap-2.5"
            style={{ background: mode==="logging-in" ? "rgba(124,58,237,.3)" : "linear-gradient(135deg,#7c3aed,#0891b2)", boxShadow: mode==="logging-in" ? "none" : "0 8px 24px rgba(124,58,237,.4)", WebkitTapHighlightColor: "transparent", touchAction: "manipulation" }}>
            {mode === "logging-in" ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Masuk…</> : <><MdLogin size={18} />Masuk sebagai {(user.displayName||"").split(" ")[0]}</>}
          </button>
          <p className="text-[10px] text-center" style={{ color: "rgba(255,255,255,.2)" }}>Scan ini akan dicatat dalam log absensi</p>
        </div>
      </Card>
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  return (
    <Card>
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(34,197,94,.15)", border: "1px solid rgba(34,197,94,.3)" }}>
          <MdCheckCircle size={32} style={{ color: "#4ade80" }} />
        </div>
        <p className="text-green-400 font-bold">Login Berhasil!</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,.4)" }}>Mengalihkan ke Dashboard…</p>
      </div>
    </Card>
  );
}

export default function QRScanClient() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center relative">
        <StarBackground />
        <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
      </div>
    }>
      <Inner />
    </Suspense>
  );
}
