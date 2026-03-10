'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import type { PublicUser } from '@/types';
import { roleBadgeClass } from '@/lib/auth.utils';
import {
  MdDashboard, MdNotes, MdPerson, MdPeople, MdSettings,
  MdClose, MdChevronRight, MdChevronLeft, MdExpandMore,
  MdBackup, MdStorage, MdDns, MdPalette, MdApps, MdBookmark,
  MdComputer
} from 'react-icons/md';
import { IoRocketSharp } from 'react-icons/io5';

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────
interface SidebarProps {
  user: PublicUser;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface NavItemProps {
  href: string;
  label: string;
  icon: React.ElementType;
  pathname: string;
  collapsed: boolean;
  onClose: () => void;
}

interface SectionHeaderProps {
  label: string;
  icon?: React.ElementType;
  open: boolean;
  onToggle: () => void;
  collapsed: boolean;
  first?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────
// Route Definitions
// ──────────────────────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { href: '/dashboard',          label: 'Dashboard',       icon: MdDashboard, roles: ['owner','co-owner','admin','developer','user'] },
  { href: '/dashboard/notes',    label: 'All Notes',       icon: MdNotes,     roles: ['owner','co-owner','admin','developer','user'] },
  { href: '/dashboard/users',    label: 'User Management', icon: MdPeople,    roles: ['owner','co-owner','admin'] },
  { href: '/dashboard/settings', label: 'Settings',        icon: MdSettings,  roles: ['owner','co-owner'] },
] as const;

/**
 * WEB SERVER items — tambahkan route kamu di sini.
 * Contoh:
 *   { href: '/dashboard/server/logs',   label: 'Logs',   icon: MdDns,    roles: ['owner','co-owner','admin'] },
 *   { href: '/dashboard/server/status', label: 'Status', icon: MdStorage, roles: ['owner','co-owner'] },
 */
const WEB_SERVER_ITEMS: { href: string; label: string; icon: React.ElementType; roles: string[] }[] = [
  // ← tambahkan item web server kamu di sini
];

const SERVER_ITEMS = [
  { href: '/dashboard/backup', label: 'Backup', icon: MdBackup, roles: ['owner','co-owner','admin','developer'] },
] as const;

// Settings section — di dalam nav scroll, di bawah Server
const SETTINGS_ITEMS = [
  { href: '/dashboard/settings/my-notes', label: 'My Notes',  icon: MdBookmark, roles: ['owner','co-owner','admin','developer','user'] },
  { href: '/dashboard/settings/profile',  label: 'Profile',   icon: MdPerson,   roles: ['owner','co-owner','admin','developer','user'] },
  { href: '/dashboard/settings/artifact', label: 'Artifact',  icon: MdApps,     roles: ['owner','co-owner','admin','developer','user'] },
  { href: '/dashboard/settings/theme',    label: 'Theme',     icon: MdPalette,  roles: ['owner','co-owner','admin','developer','user'] },
] as const;

// ──────────────────────────────────────────────────────────────────────────
// localStorage bool hook
// ──────────────────────────────────────────────────────────────────────────
function useLocalBool(key: string, def: boolean): [boolean, (v: boolean) => void] {
  const [val, setVal] = useState(def);

  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s !== null) setVal(s === 'true');
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

// ──────────────────────────────────────────────────────────────────────────
// NavItem — defined OUTSIDE Sidebar to prevent remount on every render
// ──────────────────────────────────────────────────────────────────────────
function NavItem({ href, label, icon: Icon, pathname, collapsed, onClose }: NavItemProps) {
  const isActive =
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      onClick={onClose}
      title={collapsed ? label : undefined}
      className={[
        'relative flex items-center rounded-xl transition-all duration-200 group',
        collapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
        isActive
          ? 'bg-gradient-to-r from-violet-600/25 to-cyan-600/15 text-[var(--c-text)] border border-violet-500/25'
          : 'text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)]',
      ].join(' ')}
    >
      <Icon
        size={19}
        className={`flex-shrink-0 ${
          isActive
            ? 'text-cyan-400'
            : 'text-[var(--c-muted)] group-hover:text-[var(--c-text)]'
        }`}
      />
      {!collapsed && (
        <>
          <span className="font-nunito font-semibold text-sm flex-1 whitespace-nowrap">{label}</span>
          {isActive && <MdChevronRight size={14} className="text-violet-400 flex-shrink-0" />}
        </>
      )}
      {collapsed && isActive && (
        <span className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-cyan-400 rounded-full" />
      )}
    </Link>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SectionHeader — defined OUTSIDE Sidebar
// ──────────────────────────────────────────────────────────────────────────
function SectionHeader({ label, icon: Icon, open, onToggle, collapsed, first = false }: SectionHeaderProps) {
  // When sidebar is collapsed, show a thin divider instead of label
  if (collapsed) {
    return <div className={`h-px mx-2 ${first ? 'my-2' : 'my-3'} bg-[var(--c-border)]`} />;
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      className={[
        'w-full flex items-center justify-between px-3 py-1.5 mb-1 rounded-lg',
        'hover:bg-[var(--c-surface)] transition-colors group',
        first ? '' : 'mt-3',
      ].join(' ')}
    >
      <span className="text-[var(--c-muted)] text-[10px] font-semibold uppercase tracking-widest opacity-60 group-hover:opacity-90 flex items-center gap-1.5 transition-opacity">
        {Icon && <Icon size={11} />}
        {label}
      </span>
      <MdExpandMore
        size={14}
        className={`text-[var(--c-muted)] opacity-50 transition-transform duration-200 ${open ? '' : '-rotate-90'}`}
      />
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main Sidebar
// ──────────────────────────────────────────────────────────────────────────
export default function Sidebar({ user, open, onClose, collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();

  const [navOpen,      setNavOpen]      = useLocalBool('sidebar_nav_open',      true);
  const [webOpen,      setWebOpen]      = useLocalBool('sidebar_web_open',      true);
  const [serverOpen,   setServerOpen]   = useLocalBool('sidebar_server_open',   true);
  const [settingsOpen, setSettingsOpen] = useLocalBool('sidebar_settings_open', true);

  const role = user.role as string;
  const filteredNav      = NAV_ITEMS.filter(i => (i.roles as readonly string[]).includes(role));
  const filteredWeb      = WEB_SERVER_ITEMS.filter(i => i.roles.includes(role));
  const filteredServer   = SERVER_ITEMS.filter(i => (i.roles as readonly string[]).includes(role));
  const filteredSettings = SETTINGS_ITEMS.filter(i => (i.roles as readonly string[]).includes(role));

  const roleColor =
    role === 'owner'     ? 'bg-amber-500'  :
    role === 'co-owner'  ? 'bg-orange-500' :
    role === 'admin'     ? 'bg-cyan-500'   :
    role === 'developer' ? 'bg-violet-500' : 'bg-slate-500';

  const navItemProps = { pathname, collapsed, onClose };

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed top-0 left-0 h-full z-50 flex flex-col border-r',
          'transition-all duration-300 ease-in-out overflow-hidden',
          open ? 'translate-x-0' : '-translate-x-full',
          'lg:translate-x-0 lg:z-30',
        ].join(' ')}
        style={{
          width: collapsed ? 68 : 260,
          background: 'var(--sidebar-bg)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderColor: 'var(--c-border)',
        }}
      >
        {/* ── Logo ─────────────────────────────────────── */}
        <div
          className="flex items-center border-b flex-shrink-0 h-16 px-3 gap-2"
          style={{ borderColor: 'var(--c-border)' }}
        >
          <div className={`flex items-center gap-2 flex-1 min-w-0 ${collapsed ? 'justify-center' : ''}`}>
            <Image
              src="/logo.png" alt="Saturn"
              width={30} height={30}
              className="drop-shadow-[0_0_8px_rgba(124,58,237,0.6)] flex-shrink-0"
            />
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-orbitron text-sm font-bold gradient-text tracking-wider leading-tight">SATURN</h1>
                <p className="font-orbitron text-[9px] text-[var(--c-muted)] tracking-widest">DASHBOARD</p>
              </div>
            )}
          </div>

          {/* Collapse toggle (desktop) */}
          <button
            type="button"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expand' : 'Collapse'}
            className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0
              text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)] transition-all"
          >
            {collapsed ? <MdChevronRight size={16} /> : <MdChevronLeft size={16} />}
          </button>

          {/* Close (mobile) */}
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-[var(--c-muted)] hover:text-[var(--c-text)] p-1 flex-shrink-0"
          >
            <MdClose size={20} />
          </button>
        </div>

        {/* ── User card ────────────────────────────────── */}
        <div className="border-b flex-shrink-0 p-3" style={{ borderColor: 'var(--c-border)' }}>
          {collapsed ? (
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600">
                  {user.avatar ? (
                    <Image src={user.avatar} alt={user.displayName} fill className="object-cover" sizes="40px" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg select-none">
                      {(user.displayName || user.username)[0].toUpperCase()}
                    </div>
                  )}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${roleColor}`}
                  style={{ borderColor: 'var(--sidebar-bg)' }}
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-2.5 rounded-xl" style={{ background: 'var(--c-surface)' }}>
              <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0">
                {user.avatar ? (
                  <Image src={user.avatar} alt={user.displayName} fill className="object-cover" sizes="36px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold select-none">
                    {(user.displayName || user.username)[0].toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--c-text)] font-semibold text-sm truncate">{user.displayName || user.username}</p>
                <p className="text-[var(--c-muted)] text-xs truncate">@{user.username}</p>
              </div>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0 ${roleBadgeClass(user.role)}`}>
                {user.role}
              </span>
            </div>
          )}
        </div>

        {/* ── Scrollable nav area ──────────────────────── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5">

          {/* ── MAIN DASHBOARD ── */}
          <SectionHeader
            label="Main Dashboard"
            icon={MdComputer}
            open={navOpen}
            onToggle={() => setNavOpen(!navOpen)}
            collapsed={collapsed}
            first
          />
          {(collapsed || navOpen) && filteredNav.map(item => (
            <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} {...navItemProps} />
          ))}

          {/* ── WEB SERVER ── */}
          <SectionHeader
            label="Web Server"
            icon={MdDns}
            open={webOpen}
            onToggle={() => setWebOpen(!webOpen)}
            collapsed={collapsed}
          />
          {(collapsed || webOpen) && (
            filteredWeb.length > 0
              ? filteredWeb.map(item => (
                  <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} {...navItemProps} />
                ))
              : !collapsed && (
                  <div
                    className="px-3 py-3 rounded-xl mx-0.5 mb-1"
                    style={{ background: 'var(--c-surface)', border: '1px dashed var(--c-border)' }}
                  >
                    <p className="text-[var(--c-muted)] text-[11px] text-center opacity-50">Belum ada item</p>
                    <p className="text-[var(--c-muted)] text-[10px] text-center opacity-30 mt-0.5">Edit WEB_SERVER_ITEMS di Sidebar.tsx</p>
                  </div>
                )
          )}

          {/* ── SERVER ── */}
          {filteredServer.length > 0 && (
            <>
              <SectionHeader
                label="Server"
                icon={MdStorage}
                open={serverOpen}
                onToggle={() => setServerOpen(!serverOpen)}
                collapsed={collapsed}
              />
              {(collapsed || serverOpen) && filteredServer.map(item => (
                <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} {...navItemProps} />
              ))}
            </>
          )}

          {/* ── SETTINGS ── (di bawah Server, masih dalam scroll) */}
          {filteredSettings.length > 0 && (
            <>
              <SectionHeader
                label="Settings"
                icon={MdSettings}
                open={settingsOpen}
                onToggle={() => setSettingsOpen(!settingsOpen)}
                collapsed={collapsed}
              />
              {(collapsed || settingsOpen) && filteredSettings.map(item => (
                <NavItem key={item.href} href={item.href} label={item.label} icon={item.icon} {...navItemProps} />
              ))}
            </>
          )}
        </nav>

        {/* ── Footer ───────────────────────────────────── */}
        <div
          className="border-t flex-shrink-0 px-3 py-2.5 flex items-center justify-center"
          style={{ borderColor: 'var(--c-border)' }}
        >
          {collapsed ? (
            <IoRocketSharp size={14} className="text-violet-400/40" />
          ) : (
            <div className="flex items-center gap-2">
              <IoRocketSharp size={12} className="text-violet-400" />
              <span className="text-[var(--c-muted)] text-[11px] font-mono whitespace-nowrap">
                v1.0.0 Saturn Dashboard
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
