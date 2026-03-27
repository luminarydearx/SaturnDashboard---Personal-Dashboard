"use client";
import { useState, useEffect, useCallback } from "react";
import { PublicUser } from "@/types";
import { motion } from "framer-motion";
import { MdRadar, MdRefresh, MdCheckCircle, MdError, MdLock, MdCampaign, MdOpenInNew, MdSpeed, MdCode, MdStar, MdSchedule, MdBuild, MdWifi, MdWifiOff } from "react-icons/md";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

interface GitInfo { stars: number; forks: number; language: string; lastCommit: string | null; lastMsg: string }
interface Project {
  id: string; name: string; url: string; color: string;
  ping: { ok: boolean; ms: number; status: number };
  speed: string;
  github: GitInfo | null;
  lockdown: { active: boolean; reason?: string; routes?: string[] };
  announce: { active: boolean; message?: string };
  status: "active" | "offline" | "maintenance";
}

const ST: Record<string, { color: string; bg: string; border: string; label: string; Icon: React.ElementType }> = {
  active:      { color: "#4ade80", bg: "rgba(34,197,94,.1)",  border: "rgba(34,197,94,.3)",  label: "Active",      Icon: MdCheckCircle },
  offline:     { color: "#f87171", bg: "rgba(239,68,68,.1)",  border: "rgba(239,68,68,.3)",  label: "Offline",     Icon: MdError },
  maintenance: { color: "#fbbf24", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.3)", label: "Maintenance", Icon: MdBuild },
};
const SPD: Record<string, string> = { "Sangat Cepat": "#4ade80", "Cepat": "#22c55e", "Normal": "#fbbf24", "Lambat": "#f87171", "Offline": "#6b7280" };

function Card({ p, i }: { key?: React.Key; p: Project; i: number }) {
  const s = ST[p.status] || ST.active;
  const lastC = p.github?.lastCommit ? formatDistanceToNow(new Date(p.github.lastCommit), { addSuffix: true, locale: localeId }) : "—";
  const metrics = [
    { Icon: MdSpeed, label: "Response", val: p.ping.ok ? `${p.ping.ms}ms` : "—", sub: p.speed, c: SPD[p.speed] || "#94a3b8" },
    { Icon: p.ping.ok ? MdWifi : MdWifiOff, label: "Ping", val: p.ping.ok ? "Online" : "Offline", sub: `HTTP ${p.ping.status || "—"}`, c: p.ping.ok ? "#4ade80" : "#f87171" },
    { Icon: MdLock, label: "Lockdown", val: p.lockdown.active ? "ON" : "OFF", sub: p.lockdown.active ? (p.lockdown.routes?.length ? `${p.lockdown.routes.length} routes` : "Full") : "Normal", c: p.lockdown.active ? "#f87171" : "#4ade80" },
    { Icon: MdCampaign, label: "Announce", val: p.announce.active ? "Active" : "None", sub: p.announce.active ? "Visible" : "No announce", c: p.announce.active ? "#fbbf24" : "var(--c-muted)" },
  ];
  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
      className="rounded-2xl overflow-hidden flex flex-col"
      style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
      <div style={{ height: 3, background: `linear-gradient(90deg,${p.color},${p.color}60)` }} />
      <div className="flex items-center gap-3 px-5 py-4 border-b" style={{ borderColor: "var(--c-border)" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg font-bold" style={{ background: `${p.color}18`, border: `1px solid ${p.color}40`, color: p.color }}>
          {p.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-base font-bold text-[var(--c-text)]">{p.name}</p>
          <a href={p.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[11px] hover:underline" style={{ color: p.color }}>
            {p.url.replace("https://","").split("/")[0]} <MdOpenInNew size={9} />
          </a>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-bold" style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}>
          <s.Icon size={11} /> {s.label}
        </div>
      </div>
      <div className="grid grid-cols-2 divide-x divide-y" style={{ borderColor: "var(--c-border)" }}>
        {metrics.map(({ Icon, label, val, sub, c }) => (
          <div key={label} className="px-4 py-3">
            <div className="flex items-center gap-1 mb-1">
              <Icon size={11} style={{ color: "var(--c-muted)" }} />
              <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--c-muted)" }}>{label}</span>
            </div>
            <p className="text-sm font-bold" style={{ color: c }}>{val}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "var(--c-muted)" }}>{sub}</p>
          </div>
        ))}
      </div>
      {p.github && (
        <div className="px-5 py-3 border-t flex items-center gap-4 flex-wrap" style={{ borderColor: "var(--c-border)", background: "rgba(0,0,0,.04)" }}>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--c-muted)" }}><MdCode size={12} />{p.github.language}</span>
          <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--c-muted)" }}><MdStar size={12} />{p.github.stars}</span>
          <span className="flex items-center gap-1 text-[11px] flex-1 min-w-0 truncate" style={{ color: "var(--c-muted)" }}><MdSchedule size={12} className="flex-shrink-0" />Last update {lastC}</span>
        </div>
      )}
      {p.github?.lastMsg && (
        <div className="px-5 py-2.5 border-t" style={{ borderColor: "var(--c-border)" }}>
          <p className="text-[11px] font-mono truncate" style={{ color: "var(--c-muted)", opacity: 0.7 }}>💾 {p.github.lastMsg}</p>
        </div>
      )}
    </motion.div>
  );
}

export default function OverviewClient({ user: _u }: { user: PublicUser }) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [auto,     setAuto]     = useState(true);
  const [lastCk,   setLastCk]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/server-overview");
      const d = await r.json();
      if (d.success) { setProjects(d.projects); setLastCk(new Date().toLocaleString("id-ID")); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (!auto) return; const iv = setInterval(load, 45_000); return () => clearInterval(iv); }, [auto, load]);

  const allOk = projects.length > 0 && projects.every(p => p.status !== "offline");
  const anyM  = projects.some(p => p.status === "maintenance");
  const avgMs = projects.filter(p => p.ping.ok).reduce((a, p) => a + p.ping.ms, 0) / (projects.filter(p => p.ping.ok).length || 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <motion.div animate={{ rotate: [0,360] }} transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdRadar size={24} style={{ color: "var(--c-accent)" }} />
          </motion.div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Smart Overview</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>Monitoring realtime semua web project</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {projects.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: allOk ? "rgba(34,197,94,.1)" : anyM ? "rgba(245,158,11,.1)" : "rgba(239,68,68,.1)", border: `1px solid ${allOk ? "rgba(34,197,94,.3)" : anyM ? "rgba(245,158,11,.3)" : "rgba(239,68,68,.3)"}`, color: allOk ? "#4ade80" : anyM ? "#fbbf24" : "#f87171" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "currentColor" }} />
              {allOk ? "Semua Online" : anyM ? "Ada Maintenance" : "Ada Masalah"}
            </div>
          )}
          <button onClick={() => setAuto(a => !a)} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: auto ? "rgba(var(--c-accent-rgb),.12)" : "var(--c-surface)", border: "1px solid var(--c-border)", color: auto ? "var(--c-accent)" : "var(--c-muted)" }}>
            Auto {auto ? "ON" : "OFF"}
          </button>
          <button onClick={load} disabled={loading} className="p-2 rounded-xl" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {projects.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Active", val: `${projects.filter(p => p.status==="active").length}/${projects.length}`, c: "#4ade80" },
            { label: "Avg Response", val: `${Math.round(avgMs)}ms`, c: avgMs < 500 ? "#4ade80" : "#fbbf24" },
            { label: "Maintenance", val: String(projects.filter(p => p.status==="maintenance").length), c: "#fbbf24" },
            { label: "Offline", val: String(projects.filter(p => p.status==="offline").length), c: "#f87171" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl px-4 py-3.5 text-center" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
              <p className="text-xl font-bold font-orbitron" style={{ color: s.c }}>{s.val}</p>
              <p className="text-[10px] uppercase tracking-wider mt-1" style={{ color: "var(--c-muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {loading && !projects.length ? (
        <div className="flex items-center justify-center gap-3 py-20" style={{ color: "var(--c-muted)" }}>
          <MdRadar size={24} className="animate-spin" /><span>Memeriksa semua web project…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {projects.map((p, i) => <Card key={p.id} p={p} i={i} />)}
        </div>
      )}
      {lastCk && <p className="text-[10px] text-center" style={{ color: "var(--c-muted)" }}>Terakhir dicek: {lastCk}{auto ? " · Auto 45s" : ""}</p>}
    </div>
  );
}
