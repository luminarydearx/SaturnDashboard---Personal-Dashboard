"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PublicUser } from "@/types";
import { useTheme } from "@/components/ui/ThemeContext";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  MdMenu, MdLogout, MdPerson, MdSettings, MdClose, MdSearch,
  MdDarkMode, MdLightMode, MdBrightnessMedium, MdChevronRight,
  MdWarning, MdAccessTime,
} from "react-icons/md";

// ── Search registry — all searchable sections live here ──────────────────
import {
  SEARCH_SECTIONS, SearchResultItem, HighlightText,
} from "@/lib/searchRegistry";

interface NavbarProps {
  user: PublicUser;
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
}

// ── Digital Clock (hydration-safe) ──────────────────────────────────────
function DigitalClock() {
  const [mounted, setMounted] = useState(false);
  const [now,     setNow]     = useState(new Date());

  useEffect(() => {
    setMounted(true); setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad  = (n: number) => String(n).padStart(2, "0");
  const days = ["Min","Sen","Sel","Rab","Kam","Jum","Sab"];

  if (!mounted) return (
    <div className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-input-bg)]">
      <span className="text-sm sm:text-base font-mono font-bold text-[var(--c-muted)] opacity-50">--:--</span>
    </div>
  );

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 rounded-xl border border-[var(--c-border)]
      bg-[var(--c-input-bg)] group transition-all hover:border-violet-500/50 hover:bg-[var(--c-surface)]">
      <div className="hidden md:flex flex-col items-center border-r border-[var(--c-border)] pr-3 group-hover:border-violet-500/30 transition-colors">
        <MdAccessTime className="text-violet-400 group-hover:rotate-12 transition-transform" size={18} />
      </div>
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline font-mono font-bold tracking-tighter">
          <span className="text-sm sm:text-lg text-[var(--c-text)]">
            {pad(now.getHours())}
            <span className="text-violet-500 animate-pulse mx-0.5">:</span>
            {pad(now.getMinutes())}
          </span>
          <span className="text-[10px] sm:text-[11px] text-violet-400 ml-1 opacity-80 w-[16px] sm:w-[18px]">
            {pad(now.getSeconds())}
          </span>
          <span className="ml-1 text-[7px] sm:text-[8px] font-sans font-black text-[var(--c-muted)] uppercase bg-[var(--c-border)] px-1 rounded-sm">
            {now.getHours() >= 12 ? "PM" : "AM"}
          </span>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-[10px] font-semibold text-[var(--c-muted)] group-hover:text-[var(--c-text)] transition-colors mt-0.5">
          <span className="text-violet-500 uppercase tracking-wider hidden md:inline">{days[now.getDay()]}</span>
          <span className="opacity-30 hidden md:inline">|</span>
          <span className="font-mono">{pad(now.getDate())}-{pad(now.getMonth()+1)}-{now.getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}

// ── SearchResults component ──────────────────────────────────────────────
interface SearchData {
  [sectionKey: string]: SearchResultItem[];
}

function SearchResults({ data, query, onClose, onNavigate }: {
  data: SearchData;
  query: string;
  onClose: () => void;
  onNavigate: (route: string) => void;
}) {
  const [hoveredItem, setHoveredItem] = useState<{ section: string; item: SearchResultItem } | null>(null);
  const [previewPos,  setPreviewPos]  = useState({ top: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const visibleSections = SEARCH_SECTIONS.filter(s => (data[s.key] ?? []).length > 0);
  const hasResults = visibleSections.length > 0;

  if (!hasResults) {
    return (
      <div className="p-4 text-center text-[var(--c-muted)] text-sm">
        No results for &ldquo;{query}&rdquo;
      </div>
    );
  }

  const handleMouseEnter = (e: React.MouseEvent, section: string, item: SearchResultItem) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPreviewPos({ top: rect.top });
    setHoveredItem({ section, item });
  };

  return (
    <div className="relative">
      {/* Results dropdown */}
      <div className="max-h-[72vh] overflow-y-auto py-2">
        {visibleSections.map(section => {
          const items = data[section.key] ?? [];
          const Icon = section.icon;
          return (
            <div key={section.key}>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <Icon size={11} className={`${section.accentClass} opacity-70`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-muted)] opacity-60">
                  {section.label}
                </span>
                <span className="ml-auto text-[9px] text-[var(--c-muted)] opacity-40">{items.length}</span>
              </div>

              {items.map(item => (
                <button
                  key={item.id}
                  onMouseEnter={e => handleMouseEnter(e, section.key, item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  onClick={() => {
                    onNavigate(section.getRoute(item));
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--c-surface)] transition-colors text-left group"
                >
                  {section.renderRow(item, query)}
                  <MdChevronRight size={14} className="text-[var(--c-muted)] opacity-0 group-hover:opacity-40 flex-shrink-0 transition-opacity" />
                </button>
              ))}
            </div>
          );
        })}
      </div>

      {/* Hover preview — fixed position to avoid overflow clipping */}
      <AnimatePresence>
        {hoveredItem && (() => {
          const section = SEARCH_SECTIONS.find(s => s.key === hoveredItem.section);
          if (!section) return null;
          return (
            <motion.div
              ref={previewRef}
              key={hoveredItem.item.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{    opacity: 0, x: -4 }}
              transition={{ duration: 0.12 }}
              className="fixed w-72 rounded-2xl shadow-2xl overflow-hidden pointer-events-none"
              style={{
                top:    Math.min(previewPos.top, window.innerHeight - 400),
                right:  "calc(20rem + 12px)", // right of dropdown + gap
                height: 360,
                zIndex: 99999,
                background: "var(--dropdown-bg)",
                border: "1px solid var(--c-border)",
              }}
            >
              {section.renderPreview(hoveredItem.item)}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────
export default function Navbar({ user, onMenuClick, onToggleSidebar }: NavbarProps) {
  const [dropOpen,          setDropOpen]          = useState(false);
  const [searchQ,           setSearchQ]           = useState("");
  const [searchFocus,       setSearchFocus]       = useState(false);
  const [results,           setResults]           = useState<SearchData | null>(null);
  const [searching,         setSearching]         = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const { theme, setTheme } = useTheme();
  const router    = useRouter();
  const dropRef   = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ROLE_CLR: Record<string, string> = {
    owner: "text-amber-400", admin: "text-cyan-400", developer: "text-violet-400", user: "text-slate-400",
  };

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (!typing && e.key === "/") { e.preventDefault(); onToggleSidebar?.(); }
      if (!typing && (e.key === "f" || e.key === "F")) { e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 50); }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "l") { e.preventDefault(); handleLogoutRequest(); }
      if (e.key === "Escape") { setSearchQ(""); setResults(null); setSearchFocus(false); (e.target as HTMLElement)?.blur?.(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onToggleSidebar]); // eslint-disable-line

  const doSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setResults(null); return; }
    setSearching(true);
    try {
      const res  = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      if (data.success) setResults(data.data);
    } finally { setSearching(false); }
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => doSearch(searchQ), 280);
    return () => { if (debounce.current) clearTimeout(debounce.current); };
  }, [searchQ, doSearch]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropRef.current   && !dropRef.current.contains(e.target as Node))   setDropOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleLogoutRequest = () => { setDropOpen(false); setShowLogoutConfirm(true); };
  const confirmLogout = async () => {
    setShowLogoutConfirm(false);
    const id = toast.loading("Signing out…");
    await fetch("/api/auth/logout", { method: "POST" });
    toast.success("Signed out!", { id });
    setTimeout(() => { router.push("/"); router.refresh(); }, 600);
  };

  const clearSearch = () => { setSearchQ(""); setResults(null); };
  const showDrop    = searchFocus && searchQ.length >= 2;
  const hasResults  = results && Object.values(results).some(arr => arr.length > 0);

  const handleNavigate = (route: string) => {
    clearSearch();
    setSearchFocus(false);
    router.push(route);
  };

  return (
    <>
      <Toaster position="top-center" gutter={12} />

      <header
        className="sticky top-0 z-20 flex items-center gap-2 sm:gap-3 px-3 md:px-6 py-2.5 border-b transition-all duration-300"
        style={{ background: "var(--navbar-bg)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderColor: "var(--c-border)" }}
      >
        <button onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)] transition-colors flex-shrink-0">
          <MdMenu size={22} />
        </button>

        <DigitalClock />
        <div className="flex-1" />

        {/* ── Search ── */}
        <div ref={searchRef} className="relative">
          <div className="relative flex items-center">
            <div className="absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none z-20">
              {searching
                ? <div className="w-3.5 h-3.5 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                : <MdSearch className="text-[var(--c-muted)]" size={15} />}
            </div>
            <input
              ref={inputRef}
              type="text"
              value={searchQ}
              autoComplete="off"
              name="saturn_search__q"
              onChange={e => { setSearchQ(e.target.value); setSearchFocus(true); }}
              onFocus={() => setSearchFocus(true)}
              placeholder="Search… (F)"
              className="h-9 rounded-xl pl-9 pr-8 text-sm font-nunito hidden md:block
                focus:outline-none transition-all duration-200 w-40 focus:w-64"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-input-border)", color: "var(--c-text)" }}
            />
            <button onClick={() => { setSearchFocus(true); setTimeout(() => inputRef.current?.focus(), 50); }}
              className="md:hidden p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)] transition-colors">
              <MdSearch size={20} />
            </button>
            {searchQ && (
              <button onClick={clearSearch} className="absolute right-2.5 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors hidden md:block">
                <MdClose size={13} />
              </button>
            )}
          </div>

          {/* ── Search Dropdown ── */}
          <AnimatePresence>
            {showDrop && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{    opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-50 shadow-2xl overflow-hidden"
                style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)" }}
              >
                {searching && !results ? (
                  <div className="p-4 text-center text-[var(--c-muted)] text-sm italic">Searching…</div>
                ) : (
                  <SearchResults
                    data={results ?? {}}
                    query={searchQ}
                    onClose={clearSearch}
                    onNavigate={handleNavigate}
                  />
                )}

                {/* Footer hint */}
                {hasResults && (
                  <div className="px-4 py-2 border-t text-[10px] text-[var(--c-muted)] flex items-center gap-3"
                    style={{ borderColor: "var(--c-border)", background: "var(--c-surface)" }}>
                    <span><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">↑↓</kbd> navigate</span>
                    <span><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/10 font-mono text-[9px]">Esc</kbd> close</span>
                    <span className="ml-auto opacity-60">Hover to preview</span>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Profile dropdown ── */}
        <div ref={dropRef} className="relative flex-shrink-0">
          <button onClick={() => setDropOpen(o => !o)}
            className="flex items-center gap-1.5 sm:gap-2 px-1.5 py-1 rounded-xl hover:bg-[var(--c-surface)] transition-colors border border-transparent hover:border-[var(--c-border)]">
            <div className="relative w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0 border border-white/10">
              {user.avatar
                ? <Image src={user.avatar} alt={user.displayName} fill className="object-cover" sizes="36px" />
                : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm select-none">{(user.displayName||user.username)[0].toUpperCase()}</div>
              }
            </div>
            <span className="text-sm font-semibold text-[var(--c-text)] hidden sm:block font-nunito max-w-[6rem] truncate">
              {user.displayName || user.username}
            </span>
          </button>

          <AnimatePresence>
            {dropOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{    opacity: 0, scale: 0.95, y: 8 }}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl z-[999] overflow-hidden shadow-2xl"
                style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)" }}
              >
                <div className="px-4 py-3 border-b flex flex-col" style={{ borderColor: "var(--c-border)" }}>
                  <span className="text-[var(--c-text)] font-bold text-sm truncate">{user.displayName || user.username}</span>
                  <span className="text-[10px] text-[var(--c-muted)] font-mono">
                    @{user.username} · <span className={ROLE_CLR[user.role] || "text-violet-400"}>{user.role}</span>
                  </span>
                </div>
                <div className="p-2 space-y-0.5">
                  <Link href="/dashboard/profile" onClick={() => setDropOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--c-surface)] transition-colors">
                    <MdPerson size={18} className="text-violet-400" />
                    <span className="text-[var(--c-text)] font-medium text-sm flex-1">My Profile</span>
                    <MdChevronRight size={14} className="text-[var(--c-muted)] opacity-50" />
                  </Link>
                  {user.role === "owner" && (
                    <Link href="/dashboard/settings" onClick={() => setDropOpen(false)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--c-surface)] transition-colors">
                      <MdSettings size={18} className="text-cyan-400" />
                      <span className="text-[var(--c-text)] font-medium text-sm flex-1">Settings</span>
                      <MdChevronRight size={14} className="text-[var(--c-muted)] opacity-50" />
                    </Link>
                  )}
                </div>
                <div className="px-3 pb-3 pt-2 border-t" style={{ borderColor: "var(--c-border)" }}>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-muted)] mb-2 px-1">Theme</p>
                  <div className="grid grid-cols-3 gap-1">
                    {([{ v: "dark" as const, Icon: MdDarkMode }, { v: "light" as const, Icon: MdLightMode }, { v: "auto" as const, Icon: MdBrightnessMedium }]).map(({ v, Icon }) => (
                      <button key={v} onClick={() => setTheme(v)}
                        className={`py-2 rounded-lg flex flex-col items-center gap-1 transition-all border
                          ${theme === v ? "bg-violet-600/20 text-violet-400 border-violet-500/30" : "text-[var(--c-muted)] hover:bg-[var(--c-surface)] border-transparent"}`}>
                        <Icon size={16} /><span className="text-[9px] font-bold uppercase">{v}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-2 border-t" style={{ borderColor: "var(--c-border)" }}>
                  <button onClick={handleLogoutRequest}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 transition-colors">
                    <div className="flex items-center gap-3 font-medium text-sm"><MdLogout size={18} /> Sign Out</div>
                    <kbd className="text-[9px] px-1.5 py-0.5 rounded border border-red-500/20 bg-red-500/5 font-mono">Ctrl+L</kbd>
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </header>

      {/* ── Logout confirm ── */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm" onClick={() => setShowLogoutConfirm(false)} />
            <div className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none p-4">
              <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="pointer-events-auto w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
                style={{ background: "var(--c-surface)", border: "1px solid rgba(239,68,68,0.3)" }}>
                <div className="p-6 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                    <MdWarning className="text-red-500" size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--c-text)]">Sign Out?</h3>
                  <p className="text-sm text-[var(--c-muted)] mt-2">Anda akan mengakhiri sesi ini. Lanjutkan?</p>
                </div>
                <div className="flex p-4 gap-3" style={{ background: "rgba(0,0,0,0.1)" }}>
                  <button onClick={() => setShowLogoutConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-[var(--c-text)] hover:opacity-80 transition"
                    style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-border)" }}>Cancel</button>
                  <button onClick={confirmLogout}
                    className="flex-1 py-2.5 rounded-xl font-bold text-sm text-white bg-red-600 hover:bg-red-500 transition">Sign Out</button>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
