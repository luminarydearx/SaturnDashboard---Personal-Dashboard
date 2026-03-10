"use client";
/**
 * ImageCropper — standalone portal modal.
 * Does NOT import Modal or AnimatePresence from framer-motion.
 * Uses plain inline styles so it always renders, regardless of CSS variables.
 *
 * Usage:
 *   {cropSrc && (
 *     <ImageCropper src={cropSrc} shape="rect" onCrop={handleCropDone} onCancel={() => setCropSrc(null)} />
 *   )}
 */

import { useState, useRef, useCallback, useEffect, type PointerEvent, type WheelEvent } from "react";
import { createPortal } from "react-dom";
import { MdCrop, MdZoomIn, MdZoomOut, MdRotateRight, MdCheck, MdClose } from "react-icons/md";

export interface ImageCropperProps {
  src: string;
  shape?: "rect" | "round";
  onCrop: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CANVAS = 300;

export default function ImageCropper({ src, shape = "rect", onCrop, onCancel }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef    = useRef<HTMLImageElement | null>(null);
  const ptrRef    = useRef<{ cx: number; cy: number; ox: number; oy: number } | null>(null);

  const [zoom,     setZoom]    = useState(1);
  const [rotation, setRot]     = useState(0);
  const [offset,   setOffset]  = useState({ x: 0, y: 0 });
  const [loaded,   setLoaded]  = useState(false);
  const [ready,    setReady]   = useState(false);

  useEffect(() => { setReady(true); }, []);

  useEffect(() => {
    setLoaded(false); setZoom(1); setRot(0); setOffset({ x: 0, y: 0 });
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload  = () => { imgRef.current = img; setLoaded(true); };
    img.onerror = () => { imgRef.current = null; };
    img.src = src;
  }, [src]);

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    const im = imgRef.current;
    if (!cv || !im || !loaded) return;
    const ctx = cv.getContext("2d")!;
    ctx.clearRect(0, 0, CANVAS, CANVAS);
    ctx.save();
    ctx.translate(CANVAS / 2 + offset.x, CANVAS / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    const sc = Math.min(CANVAS / im.naturalWidth, CANVAS / im.naturalHeight);
    ctx.drawImage(im, -im.naturalWidth * sc / 2, -im.naturalHeight * sc / 2, im.naturalWidth * sc, im.naturalHeight * sc);
    ctx.restore();
    if (shape === "round") {
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath(); ctx.arc(CANVAS / 2, CANVAS / 2, CANVAS / 2, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = "source-over";
    }
  }, [zoom, rotation, offset, loaded, shape]);

  useEffect(() => { draw(); }, [draw]);

  const onPD = (e: PointerEvent<HTMLCanvasElement>) => {
    (e.currentTarget).setPointerCapture(e.pointerId);
    ptrRef.current = { cx: e.clientX, cy: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPM = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!ptrRef.current) return;
    setOffset({ x: ptrRef.current.ox + e.clientX - ptrRef.current.cx, y: ptrRef.current.oy + e.clientY - ptrRef.current.cy });
  };
  const onPU = () => { ptrRef.current = null; };
  const onWh = (e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setZoom(z => Math.min(4, Math.max(0.3, z - e.deltaY * 0.002)));
  };

  const reset = () => { setZoom(1); setRot(0); setOffset({ x: 0, y: 0 }); };
  const apply = () => { const cv = canvasRef.current; if (cv) onCrop(cv.toDataURL("image/jpeg", 0.92)); };

  if (!ready) return null;

  return createPortal(
    <div style={{ position:"fixed",inset:0,zIndex:99999,background:"rgba(0,0,0,0.88)",backdropFilter:"blur(12px)",display:"flex",alignItems:"center",justifyContent:"center",padding:16 }}>
      <div style={{ width:"100%",maxWidth:380,borderRadius:20,overflow:"hidden",background:"#0f0f1a",border:"1px solid rgba(255,255,255,0.1)",boxShadow:"0 32px 80px rgba(0,0,0,0.7)",display:"flex",flexDirection:"column" }}>

        {/* Header */}
        <div style={{ display:"flex",alignItems:"center",gap:10,padding:"12px 16px",borderBottom:"1px solid rgba(255,255,255,0.07)",background:"rgba(255,255,255,0.02)" }}>
          <MdCrop size={18} style={{ color:"#a78bfa",flexShrink:0 }} />
          <span style={{ fontWeight:700,color:"#fff",fontSize:14,flex:1 }}>Crop &amp; Adjust Photo</span>
          <span style={{ color:"#64748b",fontSize:11,marginRight:4 }}>drag · scroll=zoom</span>
          <button onClick={onCancel} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",padding:4,borderRadius:8,display:"flex",alignItems:"center" }}>
            <MdClose size={18} />
          </button>
        </div>

        {/* Canvas */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"center",padding:20,background:"#050508" }}>
          <div style={{ width:CANVAS,height:CANVAS,borderRadius:shape==="round"?"50%":14,overflow:"hidden",border:"2px solid rgba(139,92,246,0.6)",boxShadow:"0 0 0 4px rgba(139,92,246,0.1)",position:"relative" }}>
            {!loaded && (
              <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center" }}>
                <div style={{ width:32,height:32,borderRadius:"50%",border:"2px solid rgba(139,92,246,0.3)",borderTopColor:"#7c3aed",animation:"cropSpin 0.8s linear infinite" }} />
              </div>
            )}
            <canvas ref={canvasRef} width={CANVAS} height={CANVAS}
              onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerLeave={onPU} onWheel={onWh}
              style={{ display:"block",cursor:"grab",touchAction:"none",userSelect:"none" }} />
          </div>
        </div>

        {/* Controls */}
        <div style={{ padding:"0 20px 12px" }}>
          {/* Zoom */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
              <span style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#64748b" }}>Zoom</span>
              <span style={{ fontSize:10,fontFamily:"monospace",color:"#a78bfa" }}>{Math.round(zoom*100)}%</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:10 }}>
              <button onClick={() => setZoom(z => Math.max(0.3, +(z-0.1).toFixed(2)))} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",padding:0,display:"flex" }}><MdZoomOut size={20} /></button>
              <input type="range" min="30" max="400" step="5" value={Math.round(zoom*100)} onChange={e => setZoom(Number(e.target.value)/100)} style={{ flex:1,accentColor:"#7c3aed",height:6,cursor:"pointer" }} />
              <button onClick={() => setZoom(z => Math.min(4, +(z+0.1).toFixed(2)))} style={{ background:"none",border:"none",cursor:"pointer",color:"#64748b",padding:0,display:"flex" }}><MdZoomIn size={20} /></button>
            </div>
          </div>

          {/* Rotation */}
          <div style={{ marginBottom:14 }}>
            <div style={{ display:"flex",justifyContent:"space-between",marginBottom:6 }}>
              <span style={{ fontSize:10,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.1em",color:"#64748b",display:"flex",alignItems:"center",gap:4 }}><MdRotateRight size={12} /> Rotation</span>
              <span style={{ fontSize:10,fontFamily:"monospace",color:"#22d3ee" }}>{rotation}°</span>
            </div>
            <div style={{ display:"flex",alignItems:"center",gap:8 }}>
              <button onClick={() => setRot(r => ((r-90)+360)%360)} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer",color:"#94a3b8",padding:"3px 8px",fontSize:11,fontFamily:"monospace" }}>-90°</button>
              <input type="range" min="0" max="360" step="1" value={rotation} onChange={e => setRot(Number(e.target.value))} style={{ flex:1,accentColor:"#0891b2",height:6,cursor:"pointer" }} />
              <button onClick={() => setRot(r => (r+90)%360)} style={{ background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:8,cursor:"pointer",color:"#94a3b8",padding:"3px 8px",fontSize:11,fontFamily:"monospace" }}>+90°</button>
            </div>
          </div>

          <div style={{ display:"flex",justifyContent:"flex-end" }}>
            <button onClick={reset} style={{ background:"none",border:"none",cursor:"pointer",color:"#a78bfa",fontSize:11,fontWeight:600,padding:0 }}>Reset</button>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display:"flex",gap:10,padding:"12px 20px 20px" }}>
          <button onClick={onCancel} style={{ flex:1,padding:"10px 0",borderRadius:12,background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",fontWeight:600,fontSize:14,cursor:"pointer" }}>Cancel</button>
          <button onClick={apply} disabled={!loaded} style={{ flex:1,padding:"10px 0",borderRadius:12,background:loaded?"linear-gradient(135deg,#7c3aed,#0891b2)":"rgba(255,255,255,0.05)",border:"none",color:"#fff",fontWeight:700,fontSize:14,cursor:loaded?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",gap:8,opacity:loaded?1:0.4 }}>
            <MdCheck size={16} /> Apply Crop
          </button>
        </div>
      </div>
      <style>{`@keyframes cropSpin{to{transform:rotate(360deg)}}`}</style>
    </div>,
    document.body
  );
}
