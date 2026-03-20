"use client";

import { useState, useEffect, useCallback } from "react";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import {
  MdRadar, MdRefresh, MdCheckCircle, MdError, MdLock, MdLockOpen,
  MdCampaign, MdOpenInNew, MdSignalWifiStatusbar4Bar,
} from "react-icons/md";
import { motion } from "framer-motion";

interface PingResult { ok: boolean; ms: number }
interface ServerResult {
  id: string; name: string; url: string;
  ping: PingResult;
  lockdown: { active: boolean; reason?: string; routes?: string[] };
  announce: { active: boolean; message?: string };
}
interface StatusData { results: ServerResult[]; checkedAt: string }

function latencyColor(ms: number, ok: boolean) {
  if (!ok) return "#ef4444";
  if (ms < 300)  return "#22c55e";
  if (ms < 800)  return "#f59e0b";
  return "#ef4444";
}
function latencyLabel(ms: number, ok: boolean) {
  if (!ok) return "Offline";
  if (ms < 300) return "Cepat";
  if (ms < 800) return "Normal";
  return "Lambat";
}

interface Props { user: PublicUser }

export default function StatusClient({ user: _user }: Props) {
  const [data,        setData]        = useState<StatusData | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { error: toastErr } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/server-status");
      const d = await r.json();
      if (d.success) setData(d);
      else toastErr(d.error || "Gagal load");
    } catch { toastErr("Koneksi gagal"); }
    finally { setLoading(false); }
  }, []); // eslint-disable-line

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const iv = setInterval(load, 30_000);
    return () => clearInterval(iv);
  }, [autoRefresh, load]);

  const allOnline  = data?.results.every(r => r.ping.ok);
  const anyLocked  = data?.results.some(r => r.lockdown?.active);
  const anyAnnounce = data?.results.some(r => r.announce?.active);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdRadar size={24} style={{ color: "var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">Server Status</h1>
            <p className="text-xs mt-0.5" style={{ color: "var(--c-muted)" }}>
              Monitor real-time semua web server — ping setiap 30 detik
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Global status */}
          {data && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: allOnline ? "rgba(34,197,94,.1)" : "rgba(239,68,68,.1)", border: allOnline ? "1px solid rgba(34,197,94,.3)" : "1px solid rgba(239,68,68,.3)", color: allOnline ? "#4ade80" : "#f87171" }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: allOnline ? "#4ade80" : "#f87171" }} />
              {allOnline ? "Semua Online" : "Ada Masalah"}
            </div>
          )}
          <button onClick={() => setAutoRefresh(a => !a)}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
            style={{ background: autoRefresh ? "rgba(var(--c-accent-rgb),.12)" : "var(--c-surface)", border: "1px solid var(--c-border)", color: autoRefresh ? "var(--c-accent)" : "var(--c-muted)" }}>
            Auto {autoRefresh ? "ON" : "OFF"}
          </button>
          <button onClick={load} disabled={loading}
            className="p-2 rounded-xl" style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
            <MdRefresh size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary banner */}
      {data && (anyLocked || anyAnnounce) && (
        <div className="flex items-center gap-3 flex-wrap">
          {anyLocked && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", color: "#f87171" }}>
              <MdLock size={13} /> Ada website yang di-lockdown
            </div>
          )}
          {anyAnnounce && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
              style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", color: "#fbbf24" }}>
              <MdCampaign size={13} /> Ada announcement aktif
            </div>
          )}
        </div>
      )}

      {/* Server cards */}
      {loading && !data ? (
        <div className="flex items-center justify-center gap-3 py-20" style={{ color: "var(--c-muted)" }}>
          <MdRefresh size={24} className="animate-spin" />
          <span>Memeriksa semua server…</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {data?.results.map((server, idx) => {
            const latColor = latencyColor(server.ping.ms, server.ping.ok);
            const latLabel = latencyLabel(server.ping.ms, server.ping.ok);
            return (
              <motion.div key={server.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.06 }}
                className="rounded-2xl overflow-hidden flex flex-col"
                style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                {/* Card header */}
                <div className="flex items-center gap-3 px-4 py-3.5 border-b"
                  style={{ borderColor: "var(--c-border)", background: "rgba(0,0,0,.06)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: server.ping.ok ? "rgba(34,197,94,.12)" : "rgba(239,68,68,.12)", border: server.ping.ok ? "1px solid rgba(34,197,94,.3)" : "1px solid rgba(239,68,68,.3)" }}>
                    <MdSignalWifiStatusbar4Bar size={16} style={{ color: server.ping.ok ? "#4ade80" : "#f87171" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[var(--c-text)]">{server.name}</p>
                    <a href={server.url} target="_blank" rel="noreferrer"
                      className="text-[10px] flex items-center gap-0.5 hover:underline truncate"
                      style={{ color: "var(--c-accent)" }}>
                      {server.url.replace("https://","").split("/")[0]} <MdOpenInNew size={9} />
                    </a>
                  </div>
                  {server.ping.ok
                    ? <MdCheckCircle size={18} style={{ color: "#4ade80", flexShrink: 0 }} />
                    : <MdError size={18} style={{ color: "#f87171", flexShrink: 0 }} />}
                </div>

                {/* Ping stats */}
                <div className="px-4 py-3 flex items-center justify-between border-b"
                  style={{ borderColor: "var(--c-border)" }}>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "var(--c-muted)" }}>Response Time</p>
                    <p className="text-xl font-bold font-orbitron" style={{ color: latColor }}>
                      {server.ping.ok ? `${server.ping.ms}ms` : "—"}
                    </p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: `${latColor}15`, color: latColor, border: `1px solid ${latColor}40` }}>
                    {latLabel}
                  </span>
                </div>

                {/* Status indicators */}
                <div className="px-4 py-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-muted)" }}>
                      {server.lockdown?.active ? <MdLock size={13} className="text-red-400" /> : <MdLockOpen size={13} className="text-emerald-400" />}
                      <span className={server.lockdown?.active ? "text-red-400 font-semibold" : "text-emerald-400"}>
                        {server.lockdown?.active
                          ? server.lockdown?.routes?.length ? `Route Lockdown (${server.lockdown.routes.length})` : "Full Lockdown"
                          : "Online"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-muted)" }}>
                      <MdCampaign size={13} style={{ color: server.announce?.active ? "#fbbf24" : "var(--c-muted)" }} />
                      <span style={{ color: server.announce?.active ? "#fbbf24" : "var(--c-muted)" }}>
                        {server.announce?.active ? "Announce ON" : "No Announce"}
                      </span>
                    </div>
                  </div>

                  {server.lockdown?.active && server.lockdown.reason && (
                    <p className="text-[11px] px-2 py-1 rounded-lg"
                      style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", color: "#fca5a5" }}>
                      {server.lockdown.reason.slice(0, 60)}
                    </p>
                  )}
                  {server.announce?.active && server.announce.message && (
                    <p className="text-[11px] px-2 py-1 rounded-lg"
                      style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", color: "#fde68a" }}>
                      {server.announce.message.slice(0, 60)}
                    </p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {data?.checkedAt && (
        <p className="text-[10px] text-center" style={{ color: "var(--c-muted)" }}>
          Terakhir dicek: {new Date(data.checkedAt).toLocaleString("id-ID")}
          {autoRefresh && " · Auto-refresh setiap 30 detik"}
        </p>
      )}
    </div>
  );
}
