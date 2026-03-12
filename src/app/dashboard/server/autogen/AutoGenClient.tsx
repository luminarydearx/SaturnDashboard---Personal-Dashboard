"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { PublicUser } from "@/types";
import { useToast } from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import {
  MdCode, MdOpenInNew, MdLock, MdLockOpen, MdRefresh, MdWarning,
  MdCheckCircle, MdVisibility, MdPlayArrow, MdStop, MdSchedule,
  MdImage, MdClose, MdKey, MdPowerSettingsNew, MdCalendarToday,
  MdVideoLibrary, MdUpload, MdCampaign, MdBarChart, MdInfo, MdError,
  MdNotifications, MdDelete, MdRoute, MdAdd,
} from "react-icons/md";
import { SiGithub } from "react-icons/si";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const AUTOGEN_URL =
  process.env.NEXT_PUBLIC_AUTOGEN_URL || "https://auto-generator-app.vercel.app";
const AUTOGEN_GITHUB = `https://github.com/${
  process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_OWNER || "luminarydearx"
}/${process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_REPO || "AutoGenerator-App"}`;
const AUTOGEN_REPO_OWNER =
  process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_OWNER || "luminarydearx";
const AUTOGEN_REPO_NAME =
  process.env.NEXT_PUBLIC_AUTOGEN_GITHUB_REPO || "AutoGenerator-App";
const BRANCH         = "master";
const LOCKDOWN_FILE  = "public/lockdown.json";
const CLOUD_NAME     = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    || "dg3awuzug";
const UPLOAD_PRESET  = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "ml_default";

// ─── Types ────────────────────────────────────────────────────────────────────
type TabId         = "lockdown" | "announce" | "analytics" | "schedule";
type AnnounceType  = "info" | "warning" | "success" | "error";

interface Schedule {
  lockdownEnabled:  boolean;
  lockdownAt:       string;
  lockdownReason:   string;
  lockdownMediaUrl: string;
  unlockEnabled:    boolean;
  unlockAt:         string;
}

interface LockdownJson {
  active:     boolean;
  reason:     string;
  timestamp:  string;
  mediaUrl?:  string;
  routes?:    string[];
}

interface RouteRule {
  path:   string;
  active: boolean;
}

const DEFAULT_SCHEDULE: Schedule = {
  lockdownEnabled: false, lockdownAt: "",
  lockdownReason: "",     lockdownMediaUrl: "",
  unlockEnabled: false,   unlockAt: "",
};

const ANNOUNCE_TYPES: { id: AnnounceType; label: string; icon: React.ElementType; color: string }[] = [
  { id: "info",    label: "Info",    icon: MdInfo,        color: "text-blue-400"  },
  { id: "success", label: "Success", icon: MdCheckCircle, color: "text-green-400" },
  { id: "warning", label: "Warning", icon: MdWarning,     color: "text-amber-400" },
  { id: "error",   label: "Error",   icon: MdError,       color: "text-red-400"   },
];

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: "lockdown",  label: "Lockdown",     icon: MdLock     },
  { id: "announce",  label: "Announcement", icon: MdCampaign },
  { id: "analytics", label: "Analytics",    icon: MdBarChart },
  { id: "schedule",  label: "Schedule",     icon: MdSchedule },
];

// ─── Main Component ───────────────────────────────────────────────────────────
interface Props { user: PublicUser }

export default function AutoGenClient({ user: _user }: Props) {
  const [tab, setTab] = useState<TabId>("lockdown");

  // Preview
  const [iframeKey,  setIframeKey]  = useState(0);
  const [showIframe, setShowIframe] = useState(false);

  // Lockdown
  const [lockdownActive,  setLockdownActive]  = useState(false);
  const [lockdownLoading, setLockdownLoading] = useState(false);
  const [lockdownReason,  setLockdownReason]  = useState("");
  const [lockdownData,    setLockdownData]    = useState<LockdownJson | null>(null);

  // Route-specific lockdown
  const [routeMode,      setRouteMode]      = useState(false);
  const [routeRules,     setRouteRules]     = useState<RouteRule[]>([]);
  const [newRoutePath,   setNewRoutePath]   = useState("");

  // Confirm modals
  const [showLockConfirm, setShowLockConfirm] = useState(false);
  const [showUnlockConf,  setShowUnlockConf]  = useState(false);

  // Push
  const [pushing,    setPushing]    = useState(false);
  const [pushStatus, setPushStatus] = useState("");

  // Media for manual lockdown
  const [mediaFile,      setMediaFile]      = useState<File | null>(null);
  const [mediaPreview,   setMediaPreview]   = useState("");
  const [mediaUrl,       setMediaUrl]       = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const mediaRef = useRef<HTMLInputElement>(null);

  // Schedule
  const [schedule,    setSchedule]    = useState<Schedule>(DEFAULT_SCHEDULE);
  const [schedSaving, setSchedSaving] = useState(false);
  const [schedSaved,  setSchedSaved]  = useState(false);

  // Schedule media
  const [schedMediaFile,    setSchedMediaFile]    = useState<File | null>(null);
  const [schedMediaPreview, setSchedMediaPreview] = useState("");
  const [schedMediaUrl,     setSchedMediaUrl]     = useState("");
  const schedMediaRef = useRef<HTMLInputElement>(null);

  // Announcement
  const [aActive,  setAActive]  = useState(false);
  const [aMsg,     setAMsg]     = useState("");
  const [aType,    setAType]    = useState<AnnounceType>("info");
  const [aLink,    setALink]    = useState("");
  const [aLinkTxt, setALinkTxt] = useState("");
  const [aSaving,  setASaving]  = useState(false);

  // Analytics
  const [analyticsData,    setAnalyticsData]    = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsMock,    setAnalyticsMock]    = useState(true);
  const [period,           setPeriod]           = useState("7d");

  // Token
  const [tokenPreview, setTokenPreview] = useState("");
  const [tokenSource,  setTokenSource]  = useState<"env" | "missing" | "">("");

  // Restart
  const [restartLoading, setRestartLoading] = useState(false);

  const { success, error: toastErr } = useToast();

  // ─── On mount ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${AUTOGEN_URL}/lockdown.json?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: LockdownJson) => {
        setLockdownData(d);
        setLockdownActive(!!d?.active);
        if (d?.active) setLockdownReason(d.reason || "");
        if (d?.mediaUrl) setMediaUrl(d.mediaUrl);
        if (d?.routes && d.routes.length > 0) {
          setRouteMode(true);
          setRouteRules(d.routes.map((r: string) => ({ path: r, active: true })));
        }
      })
      .catch(() => {});

    fetch(`${AUTOGEN_URL}/announce.json?_=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: any) => {
        if (d?.active) {
          setAActive(true); setAMsg(d.message || "");
          setAType(d.type || "info"); setALink(d.link || ""); setALinkTxt(d.linkText || "");
        }
      })
      .catch(() => {});

    fetch("/api/autogen/schedule", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: any) => { if (s && !s.error) setSchedule(s as Schedule); })
      .catch(() => {});

    fetch("/api/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((d: any) => {
        if (d?.tokenPreview) setTokenPreview(d.tokenPreview);
        if (d?.tokenSource)  setTokenSource(d.tokenSource as "env" | "missing");
      })
      .catch(() => {});
  }, []);

  // ─── Schedule polling ──────────────────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      if (schedule.lockdownEnabled && schedule.lockdownAt && !lockdownActive)
        if (now >= new Date(schedule.lockdownAt).getTime())
          executeLockdown(schedule.lockdownReason, schedule.lockdownMediaUrl, true);
      if (schedule.unlockEnabled && schedule.unlockAt && lockdownActive)
        if (now >= new Date(schedule.unlockAt).getTime())
          executeUnlock(true);
    };
    tick();
    const iv = setInterval(tick, 60_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schedule, lockdownActive]);

  // ─── Push to GitHub via server API (token never exposed to client) ─────────
  const pushToGitHub = async (
    files: { path: string; content: string }[],
    msg: string
  ): Promise<boolean> => {
    setPushing(true);
    setPushStatus("Pushing ke GitHub…");
    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          owner: AUTOGEN_REPO_OWNER, repo: AUTOGEN_REPO_NAME,
          branch: BRANCH, files, message: msg,
        }),
      });
      const d = await res.json();
      if (res.ok && d.success) {
        setPushStatus("✓ Pushed — Vercel deploying…");
        success("Pushed! Vercel akan deploy dalam ~30 detik");
        setTimeout(() => setPushStatus(""), 6000);
        return true;
      }
      throw new Error(d.error || d.message || "Push gagal");
    } catch (e: any) {
      toastErr(e.message || "Push gagal");
      setPushStatus("✗ Push gagal");
      setTimeout(() => setPushStatus(""), 5000);
      return false;
    } finally { setPushing(false); }
  };

  // ─── Cloudinary upload ────────────────────────────────────────────────────
  const uploadToCloudinary = async (file: File): Promise<string> => {
    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        { method: "POST", body: fd }
      );
      if (!res.ok) throw new Error("Upload Cloudinary gagal");
      return (await res.json()).secure_url as string;
    } finally { setUploadingMedia(false); }
  };

  const onMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setMediaFile(f); setMediaUrl("");
    const r = new FileReader();
    r.onload = (ev) => setMediaPreview(ev.target?.result as string);
    r.readAsDataURL(f);
  };
  const clearMedia = () => {
    setMediaFile(null); setMediaPreview(""); setMediaUrl("");
    if (mediaRef.current) mediaRef.current.value = "";
  };
  const isVideo = (u: string) => /\.(mp4|webm|mov|avi|ogg)(\?|$)/i.test(u);

  // ─── Execute lockdown ─────────────────────────────────────────────────────
  const executeLockdown = async (
    reason: string, existingMediaUrl = "", fromSchedule = false
  ) => {
    setLockdownLoading(true);
    try {
      let finalMediaUrl = existingMediaUrl || mediaUrl;
      if (mediaFile && !mediaUrl) {
        try { finalMediaUrl = await uploadToCloudinary(mediaFile); setMediaUrl(finalMediaUrl); }
        catch { toastErr("Upload media gagal — lanjut tanpa media"); }
      }
      const activeRoutes = routeMode
        ? routeRules.filter((r: RouteRule) => r.active && r.path.trim()).map((r: RouteRule) => r.path.trim())
        : undefined;
      const payload: LockdownJson = {
        active: true, reason: reason || "", timestamp: new Date().toISOString(),
        ...(finalMediaUrl ? { mediaUrl: finalMediaUrl } : {}),
        ...(activeRoutes && activeRoutes.length > 0 ? { routes: activeRoutes } : {}),
      };
      const routeLabel = activeRoutes && activeRoutes.length > 0
        ? ` (routes: ${activeRoutes.join(", ")})` : " (full)";
      const ok = await pushToGitHub(
        [{ path: LOCKDOWN_FILE, content: JSON.stringify(payload, null, 2) }],
        `🔒 AutoGen: Lockdown${routeLabel}${reason ? ` — ${reason}` : ""}`
      );
      if (ok) {
        setLockdownActive(true); setLockdownData(payload);
        if (fromSchedule) {
          const upd = { ...schedule, lockdownEnabled: false };
          setSchedule(upd);
          fetch("/api/autogen/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) }).catch(() => {});
        }
      }
    } finally { setLockdownLoading(false); }
  };

  // ─── Execute unlock ───────────────────────────────────────────────────────
  const executeUnlock = async (fromSchedule = false) => {
    setLockdownLoading(true);
    try {
      const payload: LockdownJson = { active: false, reason: "", timestamp: new Date().toISOString() };
      const ok = await pushToGitHub(
        [{ path: LOCKDOWN_FILE, content: JSON.stringify(payload, null, 2) }],
        "🔓 AutoGen: Lockdown deactivated"
      );
      if (ok) {
        setLockdownActive(false); setLockdownReason(""); clearMedia();
        setLockdownData(null); setRouteRules([]); setRouteMode(false);
        if (fromSchedule) {
          const upd = { ...schedule, unlockEnabled: false };
          setSchedule(upd);
          fetch("/api/autogen/schedule", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(upd) }).catch(() => {});
        }
      }
    } finally { setLockdownLoading(false); }
  };

  const handleLockdown = () => { setShowLockConfirm(false); executeLockdown(lockdownReason); };
  const handleUnlock   = () => { setShowUnlockConf(false);  executeUnlock(); };

  // ─── Save schedule ────────────────────────────────────────────────────────
  const saveSchedule = async () => {
    setSchedSaving(true);
    try {
      let finalMedia = schedMediaUrl || schedule.lockdownMediaUrl;
      if (schedMediaFile && !schedMediaUrl) {
        const url = await uploadToCloudinary(schedMediaFile);
        setSchedMediaUrl(url); finalMedia = url;
        setSchedule((s: Schedule) => ({ ...s, lockdownMediaUrl: url }));
      }
      const payload = { ...schedule, lockdownMediaUrl: finalMedia };
      const res = await fetch("/api/autogen/schedule", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Gagal");
      setSchedSaved(true); setTimeout(() => setSchedSaved(false), 2500);
    } catch (e: any) { toastErr(e.message); }
    finally { setSchedSaving(false); }
  };

  // ─── Save announcement — all via POST body, nothing in URL ───────────────
  const saveAnnounce = async (active: boolean) => {
    setASaving(true);
    try {
      const res = await fetch("/api/autogen/announce", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active, message: aMsg, type: aType, link: aLink, linkText: aLinkTxt }),
      });
      const d = await res.json();
      if (!d.success) throw new Error(d.error || "Gagal");
      setAActive(active);
      success(active ? "📢 Announcement dipublish!" : "🗑️ Announcement dihapus!");
    } catch (e: any) { toastErr(e.message); }
    finally { setASaving(false); }
  };

  // ─── Fetch analytics ──────────────────────────────────────────────────────
  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(`/api/autogen/analytics?period=${period}`);
      const d = await res.json();
      setAnalyticsData(d.data || []);
      setAnalyticsMock(d.mock !== false);
    } catch { setAnalyticsData([]); }
    finally { setAnalyticsLoading(false); }
  }, [period]);

  useEffect(() => { if (tab === "analytics") fetchAnalytics(); }, [tab, fetchAnalytics]);

  // ─── Redeploy ─────────────────────────────────────────────────────────────
  const restartServer = async () => {
    setRestartLoading(true);
    try {
      const res = await fetch("/api/server/restart", { method: "POST" });
      const d = await res.json();
      if (d.success) success(`AutoGen redeploy dimulai! ~30 detik.`);
      else toastErr(d.message || "Redeploy gagal");
    } catch (e: any) { toastErr(e.message || "Gagal koneksi"); }
    finally { setRestartLoading(false); }
  };

  // ─── Route helpers ────────────────────────────────────────────────────────
  const addRouteRule  = () => {
    if (!newRoutePath.trim()) return;
    setRouteRules((r: RouteRule[]) => [...r, { path: newRoutePath.trim(), active: true }]);
    setNewRoutePath("");
  };
  const removeRouteRule = (i: number) => setRouteRules((r: RouteRule[]) => r.filter((_: RouteRule, idx: number) => idx !== i));
  const toggleRouteRule = (i: number) => setRouteRules((r: RouteRule[]) => r.map((rule: RouteRule, idx: number) => idx === i ? { ...rule, active: !rule.active } : rule));

  // ─── Date helpers ─────────────────────────────────────────────────────────
  const fmtDT = (iso: string) => {
    if (!iso) return "";
    try { return new Date(iso).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  };
  const toLocalDT   = (iso: string) => { if (!iso) return ""; try { return new Date(iso).toISOString().slice(0, 16); } catch { return ""; } };
  const fromLocalDT = (val: string) => (val ? new Date(val).toISOString() : "");

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">

      {/* ══ HEADER ══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.3),rgba(var(--c-accent2-rgb),.2))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
            <MdCode size={24} style={{ color: "var(--c-accent)" }} />
          </div>
          <div>
            <h1 className="font-orbitron text-2xl font-bold text-[var(--c-text)]">AutoGen</h1>
            <a href={AUTOGEN_URL} target="_blank" rel="noreferrer"
              className="text-sm flex items-center gap-1 hover:underline" style={{ color: "var(--c-accent)" }}>
              {AUTOGEN_URL} <MdOpenInNew size={12} />
            </a>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {pushStatus && (
            <span className="text-xs px-3 py-1.5 rounded-full font-mono"
              style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
              {pushStatus}
            </span>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
            style={{ background: lockdownActive ? "rgba(239,68,68,.1)" : "rgba(34,197,94,.1)", border: lockdownActive ? "1px solid rgba(239,68,68,.3)" : "1px solid rgba(34,197,94,.3)", color: lockdownActive ? "#f87171" : "#4ade80" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: lockdownActive ? "#f87171" : "#4ade80" }} />
            {lockdownActive ? (lockdownData?.routes ? `ROUTE LOCK (${lockdownData.routes.length})` : "LOCKED") : "ONLINE"}
          </div>

          {lockdownActive ? (
            <button onClick={() => setShowUnlockConf(true)} disabled={lockdownLoading || pushing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.3)", color: "#4ade80" }}>
              <MdLockOpen size={15} /> {lockdownLoading || pushing ? "…" : "Unlock"}
            </button>
          ) : (
            <button onClick={() => setShowLockConfirm(true)} disabled={lockdownLoading || pushing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", color: "#f87171" }}>
              <MdLock size={15} /> {lockdownLoading || pushing ? "…" : "Lockdown"}
            </button>
          )}

          <div title={tokenSource === "env" ? `GITHUB_TOKEN: ${tokenPreview}` : "GITHUB_TOKEN tidak ditemukan!"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono cursor-default"
            style={{ background: tokenSource === "env" ? "rgba(34,197,94,.08)" : "rgba(239,68,68,.08)", border: tokenSource === "env" ? "1px solid rgba(34,197,94,.25)" : "1px solid rgba(239,68,68,.35)", color: tokenSource === "env" ? "#4ade80" : "#f87171" }}>
            <MdKey size={12} />
            {tokenPreview || (tokenSource === "missing" ? "⚠ NO TOKEN" : "…")}
          </div>

          <button onClick={restartServer} disabled={restartLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(var(--c-accent-rgb),.08)", border: "1px solid rgba(var(--c-accent-rgb),.2)", color: "var(--c-accent)" }}>
            <MdPowerSettingsNew size={14} className={restartLoading ? "animate-spin" : ""} />
            {restartLoading ? "Deploying…" : "Redeploy"}
          </button>

          <a href={AUTOGEN_GITHUB} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)]"
            style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
            <SiGithub size={14} />
          </a>
        </div>
      </div>

      {/* TOKEN MISSING WARNING */}
      {tokenSource === "missing" && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3 px-4 py-3 rounded-xl"
          style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)" }}>
          <MdWarning size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed text-[var(--c-muted)]">
            <span className="font-bold text-red-400">GITHUB_TOKEN tidak ditemukan!</span>{" "}
            Tambahkan di Vercel Dashboard → Settings → Environment Variables →{" "}
            <code className="font-mono bg-black/20 px-1 rounded">GITHUB_TOKEN</code>
          </p>
        </motion.div>
      )}

      {/* ══ 2-COLUMN LAYOUT ══════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_460px] gap-5 items-start">

        {/* ── LEFT: PREVIEW ─────────────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", minHeight: 580 }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
            style={{ borderColor: "var(--c-border)", background: "var(--c-surface2)" }}>
            <div className="flex items-center gap-1.5 flex-1 px-3 py-1.5 rounded-lg text-xs font-mono text-[var(--c-muted)]"
              style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
              <MdOpenInNew size={12} /> {AUTOGEN_URL}
            </div>
            <button onClick={() => { setShowIframe(true); setIframeKey((p: number) => p + 1); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold btn-primary">
              <MdPlayArrow size={14} /> Preview
            </button>
            {showIframe && (
              <>
                <button onClick={() => setIframeKey((p: number) => p + 1)}
                  className="p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)]"
                  style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>
                  <MdRefresh size={14} />
                </button>
                <button onClick={() => setShowIframe(false)}
                  className="p-2 rounded-xl text-red-400"
                  style={{ border: "1px solid rgba(239,68,68,.2)" }}>
                  <MdStop size={14} />
                </button>
              </>
            )}
          </div>
          {showIframe ? (
            <iframe key={iframeKey} src={AUTOGEN_URL} className="flex-1 w-full border-0"
              style={{ minHeight: 530 }} title="AutoGen Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups" />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-5 py-20">
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg,rgba(var(--c-accent-rgb),.2),rgba(var(--c-accent2-rgb),.1))", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
                <MdVisibility size={36} style={{ color: "var(--c-accent)" }} />
              </div>
              <div className="text-center">
                <p className="font-orbitron text-lg font-bold text-[var(--c-text)] mb-2">Live Preview</p>
                <p className="text-[var(--c-muted)] text-sm">Preview website AutoGen secara realtime</p>
              </div>
              <button onClick={() => { setShowIframe(true); setIframeKey((p: number) => p + 1); }} className="btn-primary">
                <MdPlayArrow size={18} /> Load Preview
              </button>
            </div>
          )}
        </motion.div>

        {/* ── RIGHT: TABBED PANEL ───────────────────────────────────────── */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl overflow-hidden flex flex-col"
          style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)" }}>

          {/* Tab bar */}
          <div className="flex border-b" style={{ borderColor: "var(--c-border)", background: "var(--c-bg)" }}>
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={() => setTab(t.id)}
                  className="flex-1 flex flex-col items-center gap-0.5 py-3 text-[10px] font-bold uppercase tracking-wider transition-all border-b-2"
                  style={{
                    borderColor:  tab === t.id ? "var(--c-accent)" : "transparent",
                    color:        tab === t.id ? "var(--c-accent)" : "var(--c-muted)",
                    background:   tab === t.id ? "rgba(var(--c-accent-rgb),.05)" : "transparent",
                  }}>
                  <Icon size={16} />
                  <span className="hidden sm:block">{t.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <AnimatePresence mode="wait">
            <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>

              {/* ════════ LOCKDOWN TAB ════════ */}
              {tab === "lockdown" && (
                <div className="p-5 flex flex-col gap-5">

                  {/* Full / Route mode switcher */}
                  <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
                    <div className="flex">
                      <button onClick={() => setRouteMode(false)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all"
                        style={{ background: !routeMode ? "rgba(239,68,68,.15)" : "var(--c-bg)", color: !routeMode ? "#f87171" : "var(--c-muted)", borderRight: "1px solid var(--c-border)" }}>
                        <MdLock size={13} /> Full Lockdown
                      </button>
                      <button onClick={() => setRouteMode(true)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold transition-all"
                        style={{ background: routeMode ? "rgba(var(--c-accent-rgb),.12)" : "var(--c-bg)", color: routeMode ? "var(--c-accent)" : "var(--c-muted)" }}>
                        <MdRoute size={13} /> Route Lockdown
                      </button>
                    </div>
                    <div className="px-3 py-2 text-[10px]" style={{ background: "rgba(0,0,0,.15)", color: "var(--c-muted)" }}>
                      {routeMode
                        ? "🔒 Hanya route tertentu yang di-block — halaman lain tetap dapat diakses"
                        : "🔒 Seluruh website di-lockdown — semua halaman menampilkan maintenance"}
                    </div>
                  </div>

                  {/* Route rules */}
                  {routeMode && (
                    <div className="flex flex-col gap-3">
                      <label className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--c-muted)" }}>
                        Route yang akan di-lockdown
                      </label>
                      {routeRules.length === 0 && (
                        <p className="text-xs" style={{ color: "var(--c-muted)" }}>Belum ada route. Tambahkan di bawah.</p>
                      )}
                      {routeRules.map((rule: RouteRule, i: number) => (
                        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", opacity: rule.active ? 1 : 0.45 }}>
                          <button onClick={() => toggleRouteRule(i)}
                            className="w-4 h-4 rounded flex-shrink-0 flex items-center justify-center transition-all"
                            style={{ background: rule.active ? "var(--c-accent)" : "var(--c-border)" }}>
                            {rule.active && <MdCheckCircle size={10} className="text-white" />}
                          </button>
                          <code className="flex-1 text-xs font-mono" style={{ color: "var(--c-accent)" }}>{rule.path}</code>
                          <button onClick={() => removeRouteRule(i)} className="text-red-400 hover:text-red-300 transition-colors">
                            <MdDelete size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input value={newRoutePath} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewRoutePath(e.target.value)}
                          placeholder="/api/generate" className="saturn-input flex-1 text-xs font-mono focus:outline-none"
                          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === "Enter" && addRouteRule()} />
                        <button onClick={addRouteRule}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1"
                          style={{ background: "rgba(var(--c-accent-rgb),.15)", color: "var(--c-accent)", border: "1px solid rgba(var(--c-accent-rgb),.3)" }}>
                          <MdAdd size={13} /> Tambah
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Reason */}
                  <div>
                    <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
                      Alasan Lockdown <span className="normal-case font-normal">(opsional)</span>
                    </label>
                    <textarea value={lockdownReason} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLockdownReason(e.target.value)}
                      placeholder="Contoh: Sedang maintenance, akan kembali segera…"
                      rows={3} className="saturn-input resize-none w-full focus:outline-none" />
                  </div>

                  {/* Media */}
                  <div>
                    <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-2">
                      Media Pendukung <span className="normal-case font-normal">(opsional)</span>
                    </label>
                    {mediaPreview || mediaUrl ? (
                      <div className="relative rounded-xl overflow-hidden"
                        style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                        {mediaFile?.type.startsWith("video") || (!mediaPreview && isVideo(mediaUrl)) ? (
                          <video src={mediaPreview || mediaUrl} controls className="w-full max-h-44 object-contain" />
                        ) : (
                          <img src={mediaPreview || mediaUrl} alt="preview" className="w-full max-h-44 object-contain" />
                        )}
                        <button onClick={clearMedia}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-white"
                          style={{ background: "rgba(239,68,68,.85)" }}>
                          <MdClose size={14} />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => mediaRef.current?.click()}
                        className="w-full flex flex-col items-center gap-2 py-7 rounded-xl border-2 border-dashed hover:border-[var(--c-accent)] transition-colors"
                        style={{ borderColor: "var(--c-border)", color: "var(--c-muted)" }}>
                        <div className="flex items-center gap-3"><MdImage size={22} /> <MdVideoLibrary size={22} /></div>
                        <span className="text-sm font-medium">Upload gambar / video</span>
                        <span className="text-xs opacity-60">JPG, PNG, GIF, MP4, WebM — maks 20MB</span>
                      </button>
                    )}
                    <input ref={mediaRef} type="file" className="hidden" accept="image/*,video/*" onChange={onMediaSelect} />
                    {uploadingMedia && (
                      <div className="flex items-center gap-2 mt-2 text-xs text-[var(--c-muted)]">
                        <MdRefresh size={13} className="animate-spin" /> Mengupload ke Cloudinary…
                      </div>
                    )}
                  </div>

                  {/* Active lockdown info */}
                  {lockdownActive && lockdownData && (
                    <div className="px-4 py-3 rounded-xl"
                      style={{ background: "rgba(239,68,68,.07)", border: "1px solid rgba(239,68,68,.25)" }}>
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-red-400">
                          {lockdownData.routes ? `ROUTE LOCK (${lockdownData.routes.length})` : "FULL LOCKDOWN ACTIVE"}
                        </p>
                        {lockdownData.timestamp && (
                          <span className="text-[10px] font-mono" style={{ color: "var(--c-muted)" }}>
                            {new Date(lockdownData.timestamp).toLocaleString("id-ID")}
                          </span>
                        )}
                      </div>
                      {lockdownData.reason && <p className="text-xs text-[var(--c-text)]">Reason: {lockdownData.reason}</p>}
                      {lockdownData.routes && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {lockdownData.routes.map((r: string) => (
                            <code key={r} className="text-[10px] px-2 py-0.5 rounded-lg font-mono"
                              style={{ background: "rgba(var(--c-accent-rgb),.1)", color: "var(--c-accent)", border: "1px solid rgba(var(--c-accent-rgb),.2)" }}>
                              {r}
                            </code>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  {lockdownActive ? (
                    <button onClick={() => setShowUnlockConf(true)} disabled={lockdownLoading || pushing}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all"
                      style={{ background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.3)", color: "#4ade80" }}>
                      <MdLockOpen size={16} />
                      {lockdownLoading || pushing ? "Memproses…" : "Unlock Sekarang"}
                    </button>
                  ) : (
                    <button onClick={() => setShowLockConfirm(true)} disabled={lockdownLoading || pushing}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-all"
                      style={{ background: "linear-gradient(135deg,#dc2626,#ef4444)" }}>
                      <MdLock size={16} />
                      {lockdownLoading || pushing ? "Memproses…" : routeMode ? "Lockdown Routes" : "Lockdown Semua"}
                    </button>
                  )}

                  <a href={`${AUTOGEN_GITHUB}/blob/master/public/lockdown.json`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs hover:opacity-80 transition-opacity" style={{ color: "var(--c-muted)" }}>
                    <SiGithub size={11} /> View lockdown.json on GitHub
                  </a>
                </div>
              )}

              {/* ════════ ANNOUNCEMENT TAB ════════ */}
              {tab === "announce" && (
                <div className="p-5 flex flex-col gap-4">
                  {aActive && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)" }}>
                      <MdNotifications size={14} className="text-amber-400 flex-shrink-0" />
                      <span className="text-xs font-bold text-amber-400">Announcement sedang aktif di AutoGen</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--c-muted)" }}>Tipe</label>
                    <div className="flex gap-2 flex-wrap">
                      {ANNOUNCE_TYPES.map(t => {
                        const Icon = t.icon;
                        return (
                          <button key={t.id} onClick={() => setAType(t.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
                            style={{ background: aType === t.id ? "rgba(var(--c-accent-rgb),.15)" : "var(--c-bg)", border: aType === t.id ? "1px solid rgba(var(--c-accent-rgb),.35)" : "1px solid var(--c-border)", color: aType === t.id ? "var(--c-accent)" : "var(--c-muted)" }}>
                            <Icon size={12} className={aType === t.id ? "" : t.color} /> {t.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)" }}>Pesan</label>
                    <textarea value={aMsg} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAMsg(e.target.value)} rows={3}
                      placeholder="Sistem sedang dalam pembaruan…"
                      className="saturn-input w-full resize-none focus:outline-none text-sm" />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)" }}>Link (opsional)</label>
                      <input value={aLink} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setALink(e.target.value)}
                        placeholder="https://…" className="saturn-input w-full text-sm focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--c-muted)" }}>Teks Link</label>
                      <input value={aLinkTxt} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setALinkTxt(e.target.value)}
                        placeholder="Pelajari…" className="saturn-input w-full text-sm focus:outline-none" />
                    </div>
                  </div>

                  {aMsg && (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm"
                      style={{
                        background: aType === "error" ? "rgba(220,38,38,.1)" : aType === "warning" ? "rgba(245,158,11,.1)" : aType === "success" ? "rgba(34,197,94,.1)" : "rgba(59,130,246,.1)",
                        border:     aType === "error" ? "1px solid rgba(220,38,38,.3)" : aType === "warning" ? "1px solid rgba(245,158,11,.3)" : aType === "success" ? "1px solid rgba(34,197,94,.3)" : "1px solid rgba(59,130,246,.3)",
                      }}>
                      {(() => { const T = ANNOUNCE_TYPES.find(t => t.id === aType)!; return <T.icon size={16} className={T.color} />; })()}
                      <span className="flex-1 text-[var(--c-text)]">{aMsg}</span>
                      {aLink && aLinkTxt && <span className="text-xs underline" style={{ color: "var(--c-accent)" }}>{aLinkTxt}</span>}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => saveAnnounce(true)} disabled={!aMsg || aSaving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm text-white"
                      style={{ background: "linear-gradient(135deg,var(--c-accent),var(--c-accent2))", opacity: !aMsg ? 0.4 : 1 }}>
                      {aSaving ? <MdRefresh size={14} className="animate-spin" /> : <MdCampaign size={14} />} Publish
                    </button>
                    {aActive && (
                      <button onClick={() => saveAnnounce(false)} disabled={aSaving}
                        className="px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2"
                        style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)", color: "var(--c-muted)" }}>
                        <MdDelete size={14} /> Hapus
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ════════ ANALYTICS TAB ════════ */}
              {tab === "analytics" && (
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--c-muted)" }}>Web Analytics — AutoGen</p>
                      {analyticsMock && <p className="text-[10px] mt-0.5 text-amber-400">* Data simulasi — set VERCEL_TOKEN untuk data nyata</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      {["7d","14d","30d"].map((p: string) => (
                        <button key={p} onClick={() => setPeriod(p)}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold transition-all"
                          style={{ background: period === p ? "var(--c-accent)" : "var(--c-bg)", color: period === p ? "#fff" : "var(--c-muted)", border: period === p ? "none" : "1px solid var(--c-border)" }}>
                          {p}
                        </button>
                      ))}
                      <button onClick={fetchAnalytics} className="p-1.5 rounded-lg" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                        <MdRefresh size={13} className={analyticsLoading ? "animate-spin" : ""} style={{ color: "var(--c-muted)" }} />
                      </button>
                    </div>
                  </div>

                  {analyticsData.length > 0 && (() => {
                    const tv   = analyticsData.reduce((a: number, d: any) => a + (d.views    || 0), 0);
                    const tvis = analyticsData.reduce((a: number, d: any) => a + (d.visitors || 0), 0);
                    const avg  = Math.round(tv / analyticsData.length);
                    return (
                      <div className="grid grid-cols-3 gap-3">
                        {[{l:"Views",v:tv,c:"var(--c-accent)"},{l:"Visitors",v:tvis,c:"#22c55e"},{l:"Avg/Day",v:avg,c:"#f59e0b"}].map(s => (
                          <div key={s.l} className="rounded-xl p-3 text-center" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                            <p className="text-lg font-bold font-orbitron" style={{ color: s.c }}>{s.v.toLocaleString()}</p>
                            <p className="text-[10px] uppercase tracking-wider mt-0.5" style={{ color: "var(--c-muted)" }}>{s.l}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {analyticsLoading ? (
                    <div className="flex items-center justify-center h-44">
                      <MdRefresh size={24} className="animate-spin" style={{ color: "var(--c-accent)" }} />
                    </div>
                  ) : analyticsData.length > 0 ? (
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analyticsData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,.05)" />
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: "var(--c-muted)" }} />
                          <YAxis tick={{ fontSize: 9, fill: "var(--c-muted)" }} />
                          <Tooltip contentStyle={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", borderRadius: 8, fontSize: 11 }} labelStyle={{ color: "var(--c-text)" }} />
                          <Legend wrapperStyle={{ fontSize: 10, color: "var(--c-muted)" }} />
                          <Line type="monotone" dataKey="views"    stroke="var(--c-accent)" strokeWidth={2} dot={false} name="Views"    />
                          <Line type="monotone" dataKey="visitors" stroke="#22c55e"          strokeWidth={2} dot={false} name="Visitors" />
                          <Line type="monotone" dataKey="sessions" stroke="#f59e0b"          strokeWidth={1.5} dot={false} name="Sessions" strokeDasharray="4 2" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="text-center py-10" style={{ color: "var(--c-muted)" }}>
                      <MdBarChart size={32} className="mx-auto mb-2 opacity-40" />
                      <p className="text-sm">Tidak ada data analytics</p>
                    </div>
                  )}
                </div>
              )}

              {/* ════════ SCHEDULE TAB ════════ */}
              {tab === "schedule" && (
                <div className="p-5 flex flex-col gap-5">

                  {/* Auto-lockdown */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MdLock size={14} className="text-red-400" />
                        <span className="text-[var(--c-text)] text-sm font-semibold">Auto-Lockdown</span>
                      </div>
                      <button onClick={() => setSchedule((s: Schedule) => ({ ...s, lockdownEnabled: !s.lockdownEnabled }))}
                        className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
                        style={{ background: schedule.lockdownEnabled ? "var(--c-accent)" : "var(--c-border)" }}>
                        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                          style={{ left: schedule.lockdownEnabled ? "22px" : "2px" }} />
                      </button>
                    </div>

                    {schedule.lockdownEnabled && (
                      <div className="flex flex-col gap-3 pl-4 border-l-2" style={{ borderColor: "rgba(239,68,68,.3)" }}>
                        <div>
                          <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Waktu Lockdown</label>
                          <input type="datetime-local" value={toLocalDT(schedule.lockdownAt)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedule((s: Schedule) => ({ ...s, lockdownAt: fromLocalDT(e.target.value) }))}
                            className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft: 12 }} />
                        </div>
                        <div>
                          <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Alasan</label>
                          <input type="text" value={schedule.lockdownReason}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedule((s: Schedule) => ({ ...s, lockdownReason: e.target.value }))}
                            placeholder="Alasan lockdown terjadwal…"
                            className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft: 12 }} />
                        </div>
                        <div>
                          <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">
                            Media <span className="normal-case font-normal">(opsional)</span>
                          </label>
                          {schedMediaPreview ? (
                            <div className="relative w-full h-28 rounded-xl overflow-hidden border" style={{ borderColor: "var(--c-border)" }}>
                              <img src={schedMediaPreview} alt="preview" className="w-full h-full object-cover" />
                              <button type="button"
                                onClick={() => { setSchedMediaFile(null); setSchedMediaPreview(""); setSchedMediaUrl(""); setSchedule((s: Schedule) => ({ ...s, lockdownMediaUrl: "" })); }}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/60">
                                <MdClose size={13} className="text-white" />
                              </button>
                              {schedMediaUrl && (
                                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-lg bg-black/70">
                                  <MdCheckCircle size={10} className="text-green-400" />
                                  <span className="text-[9px] text-green-400">Uploaded ✓</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <button type="button" onClick={() => schedMediaRef.current?.click()}
                              className="w-full py-5 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm transition-colors"
                              style={{ borderColor: "var(--c-border)", color: "var(--c-muted)", background: "var(--c-bg)" }}>
                              <MdImage size={16} /> Pilih Gambar untuk Schedule
                            </button>
                          )}
                          <input ref={schedMediaRef} type="file" accept="image/*" className="hidden"
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              if (!file.type.startsWith("image/")) { toastErr("Hanya file gambar"); return; }
                              setSchedMediaFile(file);
                              setSchedMediaPreview(URL.createObjectURL(file));
                              setSchedMediaUrl("");
                            }} />
                          {schedMediaFile && !schedMediaUrl && (
                            <button type="button"
                              onClick={async () => {
                                setUploadingMedia(true);
                                try {
                                  const url = await uploadToCloudinary(schedMediaFile);
                                  setSchedMediaUrl(url);
                                  setSchedule((s: Schedule) => ({ ...s, lockdownMediaUrl: url }));
                                } catch (e: any) { toastErr("Upload gagal"); }
                                finally { setUploadingMedia(false); }
                              }}
                              disabled={uploadingMedia}
                              className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                              style={{ background: "var(--c-accent)" }}>
                              {uploadingMedia
                                ? <><MdRefresh size={12} className="animate-spin" /> Uploading…</>
                                : <><MdUpload size={12} /> Upload Sekarang</>}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Auto-unlock */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <MdLockOpen size={14} className="text-green-400" />
                        <span className="text-[var(--c-text)] text-sm font-semibold">Auto-Unlock</span>
                      </div>
                      <button onClick={() => setSchedule((s: Schedule) => ({ ...s, unlockEnabled: !s.unlockEnabled }))}
                        className="w-11 h-6 rounded-full transition-all relative flex-shrink-0"
                        style={{ background: schedule.unlockEnabled ? "#22c55e" : "var(--c-border)" }}>
                        <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow-sm"
                          style={{ left: schedule.unlockEnabled ? "22px" : "2px" }} />
                      </button>
                    </div>

                    {schedule.unlockEnabled && (
                      <div className="flex flex-col gap-3 pl-4 border-l-2" style={{ borderColor: "rgba(34,197,94,.3)" }}>
                        <div>
                          <label className="block text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1.5">Waktu Unlock</label>
                          <input type="datetime-local" value={toLocalDT(schedule.unlockAt)}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSchedule((s: Schedule) => ({ ...s, unlockAt: fromLocalDT(e.target.value) }))}
                            className="saturn-input w-full focus:outline-none text-sm" style={{ paddingLeft: 12 }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Save */}
                  <button onClick={saveSchedule} disabled={schedSaving}
                    className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all"
                    style={{ background: schedSaved ? "rgba(34,197,94,.1)" : "var(--c-gradient-r)", border: schedSaved ? "1px solid rgba(34,197,94,.3)" : "none", color: schedSaved ? "#4ade80" : "#fff" }}>
                    {schedSaving ? <><MdRefresh size={14} className="animate-spin" /> Menyimpan…</>
                      : schedSaved ? <><MdCheckCircle size={14} /> Jadwal Disimpan!</>
                      : <><MdCalendarToday size={14} /> Simpan Jadwal</>}
                  </button>

                  {/* Upcoming events */}
                  {((schedule.lockdownEnabled && schedule.lockdownAt) || (schedule.unlockEnabled && schedule.unlockAt)) && (
                    <div className="rounded-xl p-4 flex flex-col gap-2" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                      <p className="text-[var(--c-muted)] text-xs font-semibold uppercase tracking-wider mb-1">Jadwal Tersimpan</p>
                      {schedule.lockdownEnabled && schedule.lockdownAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>🔒</span>
                          <span className="text-[var(--c-text)]">Lockdown:</span>
                          <span className="font-semibold" style={{ color: "var(--c-accent)" }}>{fmtDT(schedule.lockdownAt)}</span>
                        </div>
                      )}
                      {schedule.unlockEnabled && schedule.unlockAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <span>🔓</span>
                          <span className="text-[var(--c-text)]">Unlock:</span>
                          <span className="font-semibold" style={{ color: "var(--c-accent)" }}>{fmtDT(schedule.unlockAt)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ══ LOCKDOWN CONFIRM MODAL ════════════════════════════════════════ */}
      {showLockConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "var(--c-surface)", border: "1px solid rgba(239,68,68,.3)" }}>
            <div className="p-6">
              <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
                {routeMode ? <MdRoute className="text-red-500" size={28} /> : <MdLock className="text-red-500" size={28} />}
              </div>
              <h3 className="text-xl font-bold text-[var(--c-text)] text-center mb-2 font-orbitron">
                {routeMode ? "Lockdown Routes?" : "Aktifkan Lockdown?"}
              </h3>
              <p className="text-sm text-[var(--c-muted)] text-center mb-4">
                {routeMode
                  ? `${routeRules.filter((r: RouteRule) => r.active).length} route akan diblokir. Halaman lain tetap dapat diakses.`
                  : "Seluruh website AutoGen akan menampilkan halaman lockdown."}
              </p>
              {routeMode && routeRules.filter((r: RouteRule) => r.active).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3 justify-center">
                  {routeRules.filter((r: RouteRule) => r.active).map((r: RouteRule) => (
                    <code key={r.path} className="text-xs px-2 py-0.5 rounded-lg font-mono"
                      style={{ background: "rgba(var(--c-accent-rgb),.1)", color: "var(--c-accent)", border: "1px solid rgba(var(--c-accent-rgb),.25)" }}>
                      {r.path}
                    </code>
                  ))}
                </div>
              )}
              {lockdownReason && (
                <div className="px-4 py-3 rounded-xl text-sm mb-3" style={{ background: "var(--c-bg)", border: "1px solid var(--c-border)" }}>
                  <span className="text-[var(--c-muted)]">Alasan: </span>
                  <span className="text-[var(--c-text)]">{lockdownReason}</span>
                </div>
              )}
              {!lockdownReason && (
                <div className="flex items-center justify-center gap-2 text-xs text-amber-400 mb-3">
                  <MdWarning size={14} /> Tidak ada alasan yang diberikan
                </div>
              )}
            </div>
            <div className="flex gap-3 p-4" style={{ background: "rgba(0,0,0,.1)" }}>
              <button onClick={() => setShowLockConfirm(false)} className="flex-1 py-2.5 rounded-xl font-bold text-sm btn-secondary">
                Batal
              </button>
              <button onClick={handleLockdown} disabled={lockdownLoading || pushing}
                className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition flex items-center justify-center gap-2">
                <MdLock size={16} />
                {lockdownLoading || pushing ? "Memproses…" : "Aktifkan"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ══ UNLOCK CONFIRM MODAL ══════════════════════════════════════════ */}
      <ConfirmModal
        isOpen={showUnlockConf}
        title="Deaktifkan Lockdown?"
        type="success"
        message="AutoGen akan kembali dapat diakses oleh semua pengunjung."
        confirmText="Unlock Site"
        cancelText="Batal"
        onConfirm={handleUnlock}
        onCancel={() => setShowUnlockConf(false)}
        isLoading={lockdownLoading || pushing}
      />
    </div>
  );
}
