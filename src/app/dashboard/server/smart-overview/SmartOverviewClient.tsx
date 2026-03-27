"use client";
import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { PublicUser } from "@/types";
import {
  MdAutoAwesome, MdRefresh, MdCheckCircle, MdError, MdOpenInNew,
  MdSpeed, MdLock, MdLockOpen, MdCampaign, MdUpdate, MdCode,
} from "react-icons/md";
import { useToast } from "@/components/ui/Toast";

interface ServerProject {
  id:         string;
  name:       string;
  url:        string;
  version?:   string;
  framework?: string;
  status:     "active"|"maintenance"|"error"|"loading";
  ping:       number | null;
  lockdown:   boolean;
  announce:   boolean;
  lastChecked: string;
  deployedAt?: string;
  responseTime?: number;
  uptime?:    number;
}

async function pingServer(url: string): Promise<{ ok: boolean; ms: number }> {
  const start = Date.now();
  try {
    const res = await fetch(`/api/proxy-ping?url=${encodeURIComponent(url)}`);
    return { ok: res.ok, ms: Date.now() - start };
  } catch { return { ok: false, ms: Date.now() - start }; }
}

const PROJECTS: Pick<ServerProject, "id"|"name"|"url"|"framework"|"version">[] = [
  { id:"autogen",   name:"AutoGen",    url:"https://auto-generator-app.vercel.app", framework:"Vite + React", version:"1.0" },
  { id:"memoire",   name:"Memoire",    url:"https://memoirepersonal.vercel.app",    framework:"Next.js",      version:"1.0" },
  { id:"codelabx",  name:"CodeLabX",   url:"https://codelabxyz.vercel.app",         framework:"Next.js",      version:"1.0" },
];

function latencyColor(ms: number|null, ok: boolean) {
  if (!ok || ms === null) return "#ef4444";
  if (ms < 400) return "#22c55e";
  if (ms < 900) return "#f59e0b";
  return "#ef4444";
}
function latencyLabel(ms: number|null, ok: boolean) {
  if (!ok || ms === null) return "Offline";
  if (ms < 400) return "Cepat";
  if (ms < 900) return "Normal";
  return "Lambat";
}

interface Props { user: PublicUser }
export default function SmartOverviewClient({ user: _user }: Props) {
  const [servers, setServers] = useState<ServerProject[]>(
    PROJECTS.map(p => ({ ...p, status:"loading", ping:null, lockdown:false, announce:false, lastChecked:"" }))
  );
  const [checking, setChecking] = useState(false);
  const { error: toastErr } = useToast();

  const checkAll = useCallback(async () => {
    setChecking(true);
    setServers(prev => prev.map(s => ({ ...s, status:"loading" as const })));

    const results = await Promise.allSettled(
      PROJECTS.map(async p => {
        const pingRes = await pingServer(p.url);
        // Try to fetch lockdown/announce from local API
        let lockdown = false;
        let announce = false;
        try {
          if (p.id !== "autogen") {
            const lr = await fetch(`/api/webserver/lockdown?id=${p.id}&branch=master`, { cache:"no-store" });
            if (lr.ok) { const ld = await lr.json(); lockdown = !!ld?.active; }
            const ar = await fetch(`/api/webserver/announce?id=${p.id}&branch=master`, { cache:"no-store" });
            if (ar.ok) { const ad = await ar.json(); announce = !!ad?.active; }
          } else {
            const lr = await fetch("/api/autogen/lockdown-state", { cache:"no-store" });
            if (lr.ok) { const ld = await lr.json(); lockdown = !!ld?.active; }
          }
        } catch {}

        return {
          ...p,
          status: lockdown ? "maintenance" as const : pingRes.ok ? "active" as const : "error" as const,
          ping:   pingRes.ok ? pingRes.ms : null,
          lockdown,
          announce,
          lastChecked: new Date().toISOString(),
          responseTime: pingRes.ms,
        } as ServerProject;
      })
    );

    setServers(results.map((r, i) => {
      if (r.status === "fulfilled") return r.value;
      return { ...PROJECTS[i], status:"error" as const, ping:null, lockdown:false, announce:false, lastChecked:new Date().toISOString() };
    }));
    setChecking(false);
  }, []);

  useEffect(() => { checkAll(); }, [checkAll]);

  const allOnline   = servers.every(s => s.status === "active" || s.status === "maintenance");
  const anyOffline  = servers.some(s => s.status === "error");
  const anyLocked   = servers.some(s => s.lockdown);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background:"linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border:"1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdAutoAwesome size={24} style={{ color:"var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Smart Overview</h1>
            <p className="text-xs mt-0.5" style={{ color:"var(--c-muted)" }}>
              Monitoring realtime semua web project — ping, status, lockdown, dan announcement
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Global status badge */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: anyOffline ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", border: anyOffline ? "1px solid rgba(239,68,68,.3)":"1px solid rgba(34,197,94,.3)", color: anyOffline ? "#f87171":"#4ade80" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: anyOffline ? "#f87171":"#4ade80" }} />
            {anyOffline ? "Ada Masalah" : anyLocked ? "Ada Maintenance" : "Semua Online"}
          </div>
          <button onClick={checkAll} disabled={checking} className="p-2 rounded-xl" style={{ background:"var(--c-surface)", border:"1px solid var(--c-border)", color:"var(--c-muted)" }}>
            <MdRefresh size={16} className={checking ? "animate-spin":""} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Total Project", val:servers.length,                                         color:"var(--c-accent)" },
          { label:"Online",        val:servers.filter(s=>s.status==="active").length,          color:"#22c55e"         },
          { label:"Maintenance",   val:servers.filter(s=>s.status==="maintenance").length,     color:"#f59e0b"         },
          { label:"Offline",       val:servers.filter(s=>s.status==="error").length,           color:"#ef4444"         },
        ].map(s => (
          <div key={s.label} className="rounded-2xl p-4 text-center" style={{ background:"var(--c-surface)", border:"1px solid var(--c-border)" }}>
            <p className="text-2xl font-bold font-orbitron" style={{ color:s.color }}>{s.val}</p>
            <p className="text-[11px] uppercase tracking-wider mt-0.5" style={{ color:"var(--c-muted)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Server cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {servers.map((srv, i) => {
          const lc   = latencyColor(srv.ping, srv.status !== "error");
          const ll   = latencyLabel(srv.ping, srv.status !== "error");
          const isOk = srv.status === "active" || srv.status === "maintenance";
          return (
            <motion.div key={srv.id} initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} transition={{ delay:i*0.08 }}
              className="rounded-2xl overflow-hidden flex flex-col"
              style={{ background:"var(--c-surface)", border: srv.status==="error" ? "1px solid rgba(239,68,68,.3)" : srv.status==="maintenance" ? "1px solid rgba(245,158,11,.3)":"1px solid var(--c-border)" }}>
              {/* Header */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b" style={{ borderColor:"var(--c-border)", background:"rgba(0,0,0,.06)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isOk ? "rgba(34,197,94,.12)":"rgba(239,68,68,.12)", border: isOk ? "1px solid rgba(34,197,94,.3)":"1px solid rgba(239,68,68,.3)" }}>
                  <MdCode size={17} style={{ color: isOk ? "#4ade80":"#f87171" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-[var(--c-text)]">{srv.name}</p>
                  <a href={srv.url} target="_blank" rel="noreferrer" className="text-[10px] flex items-center gap-0.5 hover:underline truncate" style={{ color:"var(--c-accent)" }}>
                    {srv.url.replace("https://","")} <MdOpenInNew size={9} />
                  </a>
                </div>
                {srv.status === "loading"
                  ? <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  : isOk ? <MdCheckCircle size={18} style={{ color:"#4ade80", flexShrink:0 }} />
                          : <MdError size={18} style={{ color:"#f87171", flexShrink:0 }} />}
              </div>

              {/* Ping stats */}
              <div className="px-4 py-3 flex items-center justify-between border-b" style={{ borderColor:"var(--c-border)" }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color:"var(--c-muted)" }}>Response Time</p>
                  <p className="text-xl font-bold font-orbitron" style={{ color:lc }}>
                    {srv.status === "loading" ? "…" : srv.ping !== null ? `${srv.ping}ms` : "—"}
                  </p>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ background:`${lc}15`, color:lc, border:`1px solid ${lc}40` }}>
                  {srv.status === "loading" ? "Checking…" : ll}
                </span>
              </div>

              {/* Details */}
              <div className="px-4 py-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5" style={{ color:"var(--c-muted)" }}>
                    {srv.lockdown ? <MdLock size={13} className="text-amber-400" /> : <MdLockOpen size={13} className="text-emerald-400" />}
                    <span className={srv.lockdown ? "text-amber-400 font-semibold" : "text-emerald-400"}>
                      {srv.lockdown ? "Lockdown Aktif" : "Normal"}
                    </span>
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color:"var(--c-muted)" }}>
                    <MdCampaign size={13} style={{ color: srv.announce ? "#fbbf24":"var(--c-muted)" }} />
                    <span style={{ color: srv.announce ? "#fbbf24":"var(--c-muted)" }}>
                      {srv.announce ? "Announce ON" : "No Announce"}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] flex-wrap" style={{ color:"var(--c-muted)" }}>
                  {srv.framework && <span className="px-1.5 py-0.5 rounded-md" style={{ background:"rgba(var(--c-accent-rgb),.08)", border:"1px solid rgba(var(--c-accent-rgb),.15)", color:"var(--c-accent)" }}>{srv.framework}</span>}
                  {srv.version   && <span>v{srv.version}</span>}
                  {srv.lastChecked && <span className="ml-auto flex items-center gap-1"><MdUpdate size={10} />Just checked</span>}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <p className="text-[10px] text-center" style={{ color:"var(--c-muted)", opacity:.5 }}>
        Data diperbarui setiap kali halaman ini dibuka atau tombol refresh diklik
      </p>
    </div>
  );
}
