"use client";
import { createPortal } from "react-dom";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { PublicUser } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { useTheme } from "@/components/ui/ThemeContext";
import {
  MdDashboard,
  MdNotes,
  MdPeople,
  MdClose,
  MdChevronRight,
  MdChevronLeft,
  MdExpandMore,
  MdBackup,
  MdStorage,
  MdDns,
  MdComputer,
  MdCode,
  MdPerson,
  MdSettings,
  MdLogout,
  MdDarkMode,
  MdLightMode,
  MdBrightnessMedium,
  MdWarning,
  MdRestore,
  MdDescription,
  MdHistory,
  MdContentPaste,
  MdAlarm,
  MdRadar,
  MdQrCode2,
} from "react-icons/md";

// ── Types ─────────────────────────────────────────────────────────────────
interface SidebarProps {
  user: PublicUser;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onOpenSettings: () => void;
}

// ── Route definitions ──────────────────────────────────────────────────────
const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: MdDashboard,
    roles: ["owner", "co-owner", "admin", "developer", "user"],
  },
  {
    href: "/dashboard/notes",
    label: "All Notes",
    icon: MdNotes,
    roles: ["owner", "co-owner", "admin", "developer", "user"],
  },
  {
    href: "/dashboard/users",
    label: "User Management",
    icon: MdPeople,
    roles: ["owner", "co-owner", "admin"],
  },
  {
    href: "/dashboard/clipboard",
    label: "Team Clipboard",
    icon: MdContentPaste,
    roles: ["owner", "co-owner", "admin", "developer", "user"],
  },
  {
    href: "/dashboard/reminders",
    label: "Reminders",
    icon: MdAlarm,
    roles: ["owner", "co-owner", "admin", "developer", "user"],
  },
];

const WEB_SERVER_ITEMS = [
  { href: '/dashboard/server/autogen',        label: 'AutoGen',       icon: MdCode,        roles: ['owner','co-owner','admin','developer'] },
  { href: '/dashboard/server/autogen/drafts', label: 'AutoGen Drafts', icon: MdDescription, roles: ['owner','co-owner','admin'] },
  { href: '/dashboard/server/memoire',   label: 'Memoire',   icon: MdDns,     roles: ['owner','co-owner','admin'] },
  { href: '/dashboard/server/codelabx', label: 'CodeLabX',  icon: MdComputer,roles: ['owner','co-owner','admin'] },
];

const SERVER_ITEMS = [
  {
    href: "/dashboard/server/attendance",
    label: "Attendance",
    icon: MdQrCode2,
    roles: ["owner", "co-owner"],
  },
  {
    href: "/dashboard/server/status",
    label: "Server Status",
    icon: MdRadar,
    roles: ["owner", "co-owner", "developer", "admin"],
  },
  {
    href: "/dashboard/server/activity",
    label: "Activity Logs",
    icon: MdHistory,
    roles: ["owner", "co-owner", "admin"],
  },
  {
    href: "/dashboard/backup",
    label: "Backup",
    icon: MdBackup,
    roles: ["owner", "co-owner", "admin", "developer"],
  },
  {
    href: "/dashboard/restore",
    label: "Restore",
    icon: MdRestore,
    roles: ["owner"],
  },
];

// ── All sections for collapsed mode ───────────────────────────────────────
const ALL_SECTIONS = [
  {
    id: "nav",
    label: "Main Dashboard",
    icon: MdComputer,
    roles: ["owner", "co-owner", "admin", "developer", "user"],
    items: NAV_ITEMS,
  },
  {
    id: "web",
    label: "Web Server",
    icon: MdDns,
    roles: ["owner", "co-owner", "admin"],
    items: WEB_SERVER_ITEMS,
  },
  {
    id: "server",
    label: "Server",
    icon: MdStorage,
    roles: ["owner", "co-owner", "admin", "developer", "user"],
    items: SERVER_ITEMS,
  },
];

// ── localStorage hook ──────────────────────────────────────────────────────
function useLocalBool(
  key: string,
  def: boolean,
): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(def);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s !== null) setVal(s === "true");
    } catch {}
  }, [key]);
  const set = (v: boolean) => {
    setVal(v);
    try {
      localStorage.setItem(key, String(v));
    } catch {}
  };
  return [val, set];
}

// ── isActive helper ────────────────────────────────────────────────────────
function isActive(href: string, pathname: string) {
  return href === "/dashboard"
    ? pathname === "/dashboard"
    : pathname === href || pathname.startsWith(href + "/");
}

// ── NavItem (expanded only) ────────────────────────────────────────────────
function NavItem({
  href,
  label,
  icon: Icon,
  pathname,
  onClose,
}: {
  href: string;
  label: string;
  icon: any;
  pathname: string;
  onClose: () => void;
}) {
  const active = isActive(href, pathname);
  return (
    <Link
      href={href}
      onClick={onClose}
      className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group"
      style={
        active
          ? {
              background:
                "linear-gradient(90deg,rgba(var(--c-accent-rgb),.2),rgba(var(--c-accent2-rgb),.08))",
              border: "1px solid rgba(var(--c-accent-rgb),.2)",
              color: "var(--c-text)",
            }
          : { color: "var(--c-muted)" }
      }
      onMouseEnter={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background =
            "var(--c-surface)";
      }}
      onMouseLeave={(e) => {
        if (!active)
          (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      <Icon
        size={18}
        style={{ color: active ? "rgb(34,211,238)" : "inherit", flexShrink: 0 }}
      />
      <span className="font-nunito font-semibold text-sm flex-1 whitespace-nowrap">
        {label}
      </span>
      {active && (
        <MdChevronRight size={14} className="text-violet-400 flex-shrink-0" />
      )}
    </Link>
  );
}

// ── SectionGroup (expanded) ────────────────────────────────────────────────
function SectionGroup({
  label,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon: any;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-1.5 mb-1 rounded-lg transition-colors mt-2"
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLElement).style.background =
            "var(--c-surface)")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLElement).style.background = "transparent")
        }
      >
        <span
          className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--c-muted)", opacity: 0.65 }}
        >
          <Icon size={11} /> {label}
        </span>
        <MdExpandMore
          size={14}
          className={`transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          style={{ color: "var(--c-muted)", opacity: 0.5 }}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── CollapsedSectionButton — uses fixed positioning to escape overflow-hidden ──
function CollapsedSectionButton({
  section,
  pathname,
  onClose,
}: {
  section: (typeof ALL_SECTIONS)[0];
  pathname: string;
  onClose: () => void;
}) {
  const [open,    setOpen]    = useState(false);
  const [pos,     setPos]     = useState({ top: 0, left: 0 });
  const btnRef    = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const Icon      = section.icon;
  const anyActive = section.items.some((i) => isActive(i.href, pathname));

  const scheduleClose = () => {
    closeTimer.current = setTimeout(() => setOpen(false), 150);
  };
  const cancelClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  };

  const openFlyout = () => {
    cancelClose();
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.top, left: r.right + 8 });
    }
    setOpen(true);
  };

  // Close on outside click / scroll
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      const flyout = document.getElementById(`flyout-${section.id}`);
      if (btnRef.current?.contains(e.target as Node)) return;
      if (flyout?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const s = () => setOpen(false);
    document.addEventListener("mousedown", h);
    window.addEventListener("scroll", s, true);
    return () => {
      document.removeEventListener("mousedown", h);
      window.removeEventListener("scroll", s, true);
    };
  }, [open, section.id]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        title={section.label}
        onClick={openFlyout}
        onMouseEnter={openFlyout}
        onMouseLeave={scheduleClose}
        className="w-full flex items-center justify-center p-2.5 rounded-xl transition-all"
        style={{
          background: anyActive || open
            ? "linear-gradient(135deg,rgba(var(--c-accent-rgb),.25),rgba(var(--c-accent2-rgb),.1))"
            : "transparent",
          border: anyActive || open
            ? "1px solid rgba(var(--c-accent-rgb),.25)"
            : "1px solid transparent",
          color: anyActive || open ? "var(--c-accent)" : "var(--c-muted)",
        }}
      >
        <Icon size={20} />
      </button>

      <AnimatePresence>
        {open && typeof window !== "undefined" && createPortal(
          <motion.div
            id={`flyout-${section.id}`}
            initial={{ opacity: 0, x: -8, scale: 0.95 }}
            animate={{ opacity: 1, x: 0,  scale: 1    }}
            exit={{    opacity: 0, x: -6, scale: 0.95 }}
            transition={{ duration: 0.14, ease: [0.16,1,0.3,1] }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              top:      pos.top,
              left:     pos.left,
              zIndex:   9999,
              minWidth: 200,
              background: "var(--c-bg)",
              border: "1px solid var(--c-border)",
              borderRadius: 16,
              boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "10px 14px 8px", borderBottom: "1px solid var(--c-border)", background: "rgba(var(--c-accent-rgb),0.06)" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <Icon size={14} style={{ color: "var(--c-accent)", flexShrink: 0 }} />
                <p style={{ fontSize:11, fontWeight:700, letterSpacing:"0.08em", textTransform:"uppercase", color: "var(--c-muted)", margin:0 }}>
                  {section.label}
                </p>
              </div>
            </div>
            {/* Items */}
            <div style={{ padding: "4px 0" }}>
              {section.items.map((item) => {
                const ItemIcon = item.icon;
                const active = isActive(item.href, pathname);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => { setOpen(false); onClose(); }}
                    style={{
                      display: "flex", alignItems: "center", gap: 10,
                      padding: "9px 14px",
                      color: active ? "var(--c-text)" : "var(--c-muted)",
                      background: active ? "rgba(var(--c-accent-rgb),0.1)" : "transparent",
                      textDecoration: "none", transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = "var(--c-surface)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) (e.currentTarget as HTMLElement).style.background = active ? "rgba(var(--c-accent-rgb),0.1)" : "transparent";
                    }}
                  >
                    <ItemIcon size={16} style={{ color: active ? "var(--c-accent)" : "inherit", flexShrink: 0 }} />
                    <span style={{ fontFamily: "Nunito, sans-serif", fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", flex: 1 }}>
                      {item.label}
                    </span>
                    {active && (
                      <MdChevronRight size={14} style={{ color: "var(--c-accent)", marginLeft: "auto" }} />
                    )}
                  </Link>
                );
              })}
            </div>
          </motion.div>,
          document.body
        )}
      </AnimatePresence>
    </>
  );
}

// ── ProfilePopup ───────────────────────────────────────────────────────────
function ProfilePopup({
  user,
  collapsed,
  sidebarWidth,
  onClose,
  onOpenSettings,
}: {
  user: PublicUser;
  collapsed: boolean;
  sidebarWidth: number;
  onClose: () => void;
  onOpenSettings: () => void;
}) {
  const [showLogout, setShowLogout] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => document.addEventListener("mousedown", h), 50);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", h);
    };
  }, [onClose]);

  const confirmLogout = async () => {
    setShowLogout(false);
    onClose();
    const id = toast.loading("Signing out…");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    toast.success("Signed out!", { id });
    // Use window.location for instant, clean navigation (no stale Next.js router state)
    setTimeout(() => { window.location.href = "/login"; }, 400);
  };

  const ROLE_CLR: Record<string, string> = {
    owner: "text-amber-400",
    "co-owner": "text-orange-400",
    admin: "text-cyan-400",
    developer: "text-violet-400",
    user: "text-slate-400",
  };

  return (
    <>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.97 }}
        transition={{ duration: 0.15 }}
        className="fixed w-64 rounded-2xl shadow-2xl overflow-hidden z-[300]"
        style={{
          left: collapsed ? sidebarWidth + 8 : 8,
          bottom: collapsed ? 8 : 72,
          background: "var(--c-bg)",
          border: "1px solid var(--c-border)",
        }}
      >
        {/* User info header */}
        <div
          className="px-4 py-3.5 border-b flex items-center gap-3"
          style={{
            borderColor: "var(--c-border)",
            background: "var(--c-surface)",
          }}
        >
          <div className="relative w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0">
            {user.avatar ? (
              <Image
                src={user.avatar}
                alt={user.displayName}
                fill
                className="object-cover"
                sizes="40px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                {(user.displayName || user.username)[0].toUpperCase()}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate text-[var(--c-text)]">
              {user.displayName || user.username}
            </p>
            <p
              className="text-[10px] font-mono"
              style={{ color: "var(--c-muted)" }}
            >
              @{user.username} ·{" "}
              <span className={ROLE_CLR[user.role] || "text-violet-400"}>
                {user.role}
              </span>
            </p>
          </div>
        </div>

        {/* Menu */}
        <div className="p-2 space-y-0.5">
          {[
            {
              href: "/dashboard/settings/profile",
              label: "My Profile",
              icon: MdPerson,
              color: "text-violet-400",
            },
          ].map(({ href, label, icon: Icon, color }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-[var(--c-text)]"
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "var(--c-surface)")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.background =
                  "transparent")
              }
            >
              <Icon size={18} className={color} />
              <span className="font-medium text-sm flex-1">{label}</span>
              <MdChevronRight
                size={14}
                style={{ color: "var(--c-muted)", opacity: 0.5 }}
              />
            </Link>
          ))}

          <button
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors text-[var(--c-text)]"
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "var(--c-surface)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "transparent")
            }
          >
            {/* kiri */}
            <div className="flex items-center gap-3">
              <MdSettings size={18} className="text-cyan-400" />
              <span className="font-medium text-sm">Settings</span>
            </div>

            {/* kanan */}
            <MdChevronRight
              size={14}
              style={{ color: "var(--c-muted)", opacity: 0.5 }}
            />
          </button>
        </div>

        {/* Theme */}
        <div
          className="px-3 pb-3 pt-1 border-t"
          style={{ borderColor: "var(--c-border)" }}
        >
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: "var(--c-muted)" }}
          >
            Theme
          </p>
          <div className="grid grid-cols-3 gap-1">
            {[
              { v: "dark" as const, Icon: MdDarkMode },
              { v: "light" as const, Icon: MdLightMode },
              { v: "auto" as const, Icon: MdBrightnessMedium },
            ].map(({ v, Icon }) => (
              <button
                key={v}
                onClick={() => setTheme(v)}
                className="py-2 rounded-lg flex flex-col items-center gap-1 transition-all border"
                style={{
                  background:
                    theme === v
                      ? "rgba(var(--c-accent-rgb),.15)"
                      : "var(--c-surface)",
                  borderColor:
                    theme === v
                      ? "rgba(var(--c-accent-rgb),.3)"
                      : "transparent",
                  color: theme === v ? "var(--c-accent)" : "var(--c-muted)",
                }}
              >
                <Icon size={15} />
                <span className="text-[9px] font-bold uppercase">{v}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sign out */}
        <div
          className="p-2 border-t"
          style={{ borderColor: "var(--c-border)" }}
        >
          <button
            onClick={() => setShowLogout(true)}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-red-400 transition-colors"
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "rgba(239,68,68,.08)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "transparent")
            }
          >
            <div className="flex items-center gap-3 font-medium text-sm">
              <MdLogout size={18} /> Sign Out
            </div>
            <kbd
              className="text-[9px] px-1.5 py-0.5 rounded border font-mono"
              style={{
                borderColor: "rgba(239,68,68,.2)",
                background: "rgba(239,68,68,.05)",
              }}
            >
              Ctrl+L
            </kbd>
          </button>
        </div>
      </motion.div>

      {/* Logout confirm */}
      <AnimatePresence>
        {showLogout && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
              onClick={() => setShowLogout(false)}
            />
            <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-4">
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{
                  background: "var(--c-surface)",
                  border: "1px solid rgba(239,68,68,.3)",
                }}
              >
                <div className="p-6 text-center">
                  <div
                    className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-4"
                    style={{
                      background: "rgba(239,68,68,.1)",
                      border: "1px solid rgba(239,68,68,.2)",
                    }}
                  >
                    <MdWarning className="text-red-500" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--c-text)]">
                    Sign Out?
                  </h3>
                  <p
                    className="text-sm mt-2"
                    style={{ color: "var(--c-muted)" }}
                  >
                    Anda akan mengakhiri sesi ini.
                  </p>
                </div>
                <div
                  className="flex p-4 gap-3"
                  style={{ background: "rgba(0,0,0,.1)" }}
                >
                  <button
                    onClick={() => setShowLogout(false)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm transition"
                    style={{
                      background: "var(--c-input-bg)",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-text)",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmLogout}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition"
                  >
                    Sign Out
                  </button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// ── Main Sidebar ───────────────────────────────────────────────────────────
export default function Sidebar({
  user,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
  onOpenSettings,
}: SidebarProps) {
  const pathname = usePathname() ?? "";
  const [profileOpen, setProfileOpen] = useState(false);
  const [navOpen, setNavOpen] = useLocalBool("sidebar_nav_open", true);
  const [webOpen, setWebOpen] = useLocalBool("sidebar_web_open", true);
  const [serverOpen, setServerOpen] = useLocalBool("sidebar_server_open", true);

  const role = user.role as string;
  const sw = collapsed ? 68 : 260;

  const filteredNav = NAV_ITEMS.filter((i) => i.roles.includes(role));
  const filteredWeb = WEB_SERVER_ITEMS.filter((i) => i.roles.includes(role));
  const filteredServer = SERVER_ITEMS.filter((i) => i.roles.includes(role));

  // Sections visible in collapsed mode
  const visibleSections = ALL_SECTIONS.filter((s) => s.roles.includes(role))
    .map((s) => ({
      ...s,
      items: s.items.filter((i) => i.roles.includes(role)),
    }))
    .filter((s) => s.items.length > 0);

  const roleColor =
    role === "owner"
      ? "bg-amber-500"
      : role === "co-owner"
        ? "bg-orange-500"
        : role === "admin"
          ? "bg-cyan-500"
          : role === "developer"
            ? "bg-violet-500"
            : "bg-slate-500";

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col border-r transition-all duration-300 ease-in-out overflow-hidden ${open ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:z-30`}
        style={{
          width: sw,
          background: "var(--sidebar-bg)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderColor: "var(--c-border)",
        }}
      >
        {/* ── Logo ── */}
        <div
          className="flex items-center border-b flex-shrink-0 h-16 px-3 gap-2"
          style={{ borderColor: "var(--c-border)" }}
        >
          <div
            className={`flex items-center gap-2 flex-1 min-w-0 ${collapsed ? "justify-center" : ""}`}
          >
            <img
              src="/logo.png"
              alt="Saturn"
              width={30}
              height={30}
              className="drop-shadow-[0_0_8px_rgba(124,58,237,0.6)] flex-shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-orbitron text-sm font-bold gradient-text tracking-wider leading-tight">
                  SATURN
                </h1>
                <p
                  className="font-orbitron text-[9px] tracking-widest"
                  style={{ color: "var(--c-muted)" }}
                >
                  DASHBOARD
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand" : "Collapse"}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0 transition-all"
            style={{ color: "var(--c-muted)" }}
            onMouseEnter={(e) => {
              Object.assign((e.currentTarget as HTMLElement).style, {
                background: "var(--c-surface)",
                color: "var(--c-text)",
              });
            }}
            onMouseLeave={(e) => {
              Object.assign((e.currentTarget as HTMLElement).style, {
                background: "transparent",
                color: "var(--c-muted)",
              });
            }}
          >
            {collapsed ? (
              <MdChevronRight size={16} />
            ) : (
              <MdChevronLeft size={16} />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden p-1 flex-shrink-0"
            style={{ color: "var(--c-muted)" }}
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* ── Nav ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2">
          {collapsed ? (
            // ═══ COLLAPSED: section icons only ═══
            <div className="flex flex-col gap-1">
              {visibleSections.map((section) => (
                <CollapsedSectionButton
                  key={section.id}
                  section={section}
                  pathname={pathname as string}
                  onClose={onClose}
                />
              ))}
            </div>
          ) : (
            // ═══ EXPANDED: full sections ═══
            <>
              {filteredNav.length > 0 && (
                <SectionGroup
                  label="Main Dashboard"
                  icon={MdComputer}
                  open={navOpen}
                  onToggle={() => setNavOpen(!navOpen)}
                >
                  {filteredNav.map((i) => (
                    <NavItem
                      key={i.href}
                      href={i.href}
                      label={i.label}
                      icon={i.icon}
                      pathname={pathname as string}
                      onClose={onClose}
                    />
                  ))}
                </SectionGroup>
              )}
              {(role === "owner" || role === "co-owner") &&
                filteredWeb.length > 0 && (
                  <SectionGroup
                    label="Web Server"
                    icon={MdDns}
                    open={webOpen}
                    onToggle={() => setWebOpen(!webOpen)}
                  >
                    {filteredWeb.map((i) => (
                      <NavItem
                        key={i.href}
                        href={i.href}
                        label={i.label}
                        icon={i.icon}
                        pathname={pathname as string}
                        onClose={onClose}
                      />
                    ))}
                  </SectionGroup>
                )}
              {filteredServer.length > 0 && (
                <SectionGroup
                  label="Server"
                  icon={MdStorage}
                  open={serverOpen}
                  onToggle={() => setServerOpen(!serverOpen)}
                >
                  {filteredServer.map((i) => (
                    <NavItem
                      key={i.href}
                      href={i.href}
                      label={i.label}
                      icon={i.icon}
                      pathname={pathname as string}
                      onClose={onClose}
                    />
                  ))}
                </SectionGroup>
              )}
            </>
          )}
        </nav>

        {/* ── Profile at bottom ── */}
        <div
          className="border-t flex-shrink-0"
          style={{ borderColor: "var(--c-border)" }}
        >
          <button
            type="button"
            onClick={() => setProfileOpen((p) => !p)}
            className="w-full flex items-center transition-colors"
            style={{
              padding: collapsed ? "10px 0" : "10px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              gap: collapsed ? 0 : 12,
            }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "var(--c-surface)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLElement).style.background =
                "transparent")
            }
          >
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600">
                {user.avatar ? (
                  <Image
                    src={user.avatar}
                    alt={user.displayName}
                    fill
                    className="object-cover"
                    sizes="36px"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm select-none">
                    {(user.displayName || user.username)[0].toUpperCase()}
                  </div>
                )}
              </div>
              <span
                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${roleColor}`}
                style={{ borderColor: "var(--sidebar-bg)" }}
              />
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[var(--c-text)] font-semibold text-sm truncate">
                  {user.displayName || user.username}
                </p>
                <p
                  className="text-[10px] truncate capitalize"
                  style={{ color: "var(--c-muted)" }}
                >
                  {user.role}
                </p>
              </div>
            )}
          </button>
        </div>
      </aside>

      {/* Profile popup */}
      <AnimatePresence>
        {profileOpen && (
          <ProfilePopup
            user={user}
            collapsed={collapsed}
            sidebarWidth={sw}
            onClose={() => setProfileOpen(false)}
            onOpenSettings={onOpenSettings}
          />
        )}
      </AnimatePresence>
    </>
  );
}