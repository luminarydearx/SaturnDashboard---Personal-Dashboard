"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { MdQrCode2, MdRefresh, MdDownload, MdCheckCircle, MdWarning } from "react-icons/md";

interface Props {
  userId:       string;
  username:     string;
  displayName:  string;
  avatar?:      string;
  qrCodeUrl?:   string;
  size?:        number;
  onGenerated?: (url: string) => void;
}

export default function QRCodeDisplay({
  userId, username, displayName, avatar,
  qrCodeUrl: storedUrl, size = 280, onGenerated,
}: Props) {
  const [qrImg,       setQrImg]       = useState(storedUrl || "");
  const [generating,  setGenerating]  = useState(false);
  const [done,        setDone]        = useState(!!storedUrl);
  const [error,       setError]       = useState("");
  const [downloading, setDownloading] = useState(false);
  const [baseUrl,     setBaseUrl]     = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isLocalhost = baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

  const generateQR = useCallback(async () => {
    setGenerating(true);
    setError("");
    try {
      // Step 1: Generate QR server-side (black/white, ECC=H, 400px)
      const res = await fetch("/api/users/qr-generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Server error");

      setBaseUrl(data.baseUrl || "");

      // Step 2: Overlay profile photo onto QR using canvas
      const canvas = canvasRef.current;
      if (!canvas) { setQrImg(data.qrCodeUrl); setDone(true); return; }
      const ctx = canvas.getContext("2d");
      if (!ctx) { setQrImg(data.qrCodeUrl); setDone(true); return; }

      canvas.width  = size;
      canvas.height = size;

      // Load the server-generated QR (pure black/white)
      await new Promise<void>(resolve => {
        const qrImage = new window.Image();
        qrImage.crossOrigin = "anonymous";
        qrImage.onload  = () => { ctx.drawImage(qrImage, 0, 0, size, size); resolve(); };
        qrImage.onerror = () => { ctx.drawImage(qrImage, 0, 0, size, size); resolve(); };
        qrImage.src = data.qrDataUrl;   // base64 from server — no CORS issues
      });

      // Overlay profile pic — max 20% of size for H-level ECC (30% damage tolerance)
      const cx = size / 2;
      const cy = size / 2;
      const r  = Math.round(size * 0.09);   // 9% radius = ~18% diameter = safe for H level

      // White padding ring behind photo
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(cx, cy, r + 5, 0, Math.PI * 2);
      ctx.fill();

      if (avatar) {
        await new Promise<void>(resolve => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            ctx.save();
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
            ctx.restore();
            resolve();
          };
          img.onerror = () => { drawInitials(ctx, cx, cy, r, displayName, username); resolve(); };
          img.src = avatar;
        });
      } else {
        drawInitials(ctx, cx, cy, r, displayName, username);
      }

      // Thin border ring
      ctx.strokeStyle = "#7c3aed";
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      ctx.stroke();

      const compositeDataUrl = canvas.toDataURL("image/png");
      setQrImg(compositeDataUrl);      // show immediately from canvas
      setDone(true);
      onGenerated?.(data.qrCodeUrl);   // notify parent with Cloudinary URL

    } catch (e: any) {
      setError(e.message || "Gagal generate QR");
    } finally {
      setGenerating(false);
    }
  }, [userId, username, displayName, avatar, size, onGenerated]); // eslint-disable-line

  useEffect(() => {
    if (!storedUrl) generateQR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Blob download — saves directly to device without opening new tab
  const download = async () => {
    if (!qrImg) return;
    setDownloading(true);
    try {
      let blobUrl: string;
      if (qrImg.startsWith("data:")) {
        // Canvas data URL — convert to blob directly
        const res  = await fetch(qrImg);
        const blob = await res.blob();
        blobUrl    = URL.createObjectURL(blob);
      } else {
        // Cloudinary URL — fetch via blob
        const res  = await fetch(qrImg);
        const blob = await res.blob();
        blobUrl    = URL.createObjectURL(blob);
      }
      const a       = document.createElement("a");
      a.href        = blobUrl;
      a.download    = `qr-${username}.png`;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(blobUrl); }, 500);
    } catch { window.open(qrImg, "_blank"); }
    finally { setDownloading(false); }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* QR image */}
      <div style={{ width: size, height: size, position: "relative", flexShrink: 0 }}>
        {generating ? (
          <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3"
            style={{ background: "var(--c-bg)", border: "2px dashed var(--c-border)" }}>
            <div className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            <p className="text-xs" style={{ color: "var(--c-muted)" }}>Membuat QR Code…</p>
          </div>
        ) : qrImg ? (
          <div style={{ position: "relative", width: "100%", height: "100%" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrImg} alt={`QR ${displayName}`}
              style={{ width: "100%", height: "100%", borderRadius: 12, border: "2px solid rgba(124,58,237,.3)", background: "#fff" }} />
            {done && !generating && (
              <div style={{ position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: "50%",
                background: "rgba(34,197,94,.9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <MdCheckCircle size={15} className="text-white" />
              </div>
            )}
          </div>
        ) : (
          <div className="w-full h-full rounded-2xl flex flex-col items-center justify-center gap-3"
            style={{ background: "var(--c-bg)", border: "2px dashed var(--c-border)" }}>
            <MdQrCode2 size={40} style={{ color: "var(--c-muted)", opacity: 0.3 }} />
            <p className="text-xs text-center px-3" style={{ color: "var(--c-muted)" }}>{error || "QR belum dibuat"}</p>
          </div>
        )}
      </div>

      {/* Localhost warning */}
      {done && isLocalhost && (
        <div className="flex items-start gap-2 px-3 py-2 rounded-xl text-[11px]"
          style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", color: "#fbbf24", maxWidth: size }}>
          <MdWarning size={14} className="flex-shrink-0 mt-0.5" />
          <span>
            QR encode <code className="font-mono">localhost:3000</code> — HP tidak bisa scan saat development lokal.
            Set <code className="font-mono">NEXT_PUBLIC_BASE_URL</code> ke URL Vercel production.
          </span>
        </div>
      )}

      {error && !generating && (
        <p className="text-xs text-red-400 text-center px-4">{error}</p>
      )}

      <div className="flex gap-2 flex-wrap justify-center">
        <button onClick={() => generateQR()} disabled={generating}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
          <MdRefresh size={13} className={generating ? "animate-spin" : ""} />
          {generating ? "Membuat…" : "Generate Ulang"}
        </button>
        {qrImg && (
          <button onClick={download} disabled={downloading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(var(--c-accent-rgb),.1)", border: "1px solid rgba(var(--c-accent-rgb),.3)", color: "var(--c-accent)" }}>
            <MdDownload size={13} /> {downloading ? "Mengunduh…" : "Download PNG"}
          </button>
        )}
      </div>

      <p className="text-[10px] text-center" style={{ color: "var(--c-muted)", opacity: 0.5, maxWidth: size }}>
        QR Code standar hitam/putih — kompatibel semua scanner
      </p>
    </div>
  );
}

function drawInitials(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, displayName: string, username: string) {
  ctx.fillStyle = "#7c3aed";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font      = `bold ${Math.round(r)}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText((displayName || username)[0].toUpperCase(), cx, cy + 1);
}
