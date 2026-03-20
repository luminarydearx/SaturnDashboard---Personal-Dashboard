"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { PublicUser } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { Toaster } from "react-hot-toast";
import { MdMenu, MdClose, MdSearch, MdAccessTime, MdChevronRight } from "react-icons/md";
import { SEARCH_SECTIONS, SearchResultItem, HighlightText } from "@/lib/searchRegistry";
import { loadShortcuts, matchesShortcut, inlineShortcut } from "@/lib/shortcuts";

interface NavbarProps {
  user: PublicUser;
  onMenuClick: () => void;
  onToggleSidebar?: () => void;
}

// ── Digital Clock ─────────────────────────────────────────────────────────────
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

// ── SearchResults ─────────────────────────────────────────────────────────────
interface SearchData { [sectionKey: string]: SearchResultItem[] }

function SearchResults({ data, query, onClose, onNavigate }: {
  data: SearchData; query: string; onClose: () => void; onNavigate: (route: string) => void;
}) {
  const [hoveredItem, setHoveredItem] = useState<{ section: string; item: SearchResultItem } | null>(null);
  const [previewPos,  setPreviewPos]  = useState({ top: 0 });
  const visibleSections = SEARCH_SECTIONS.filter(s => (data[s.key] ?? []).length > 0);
  if (!visibleSections.length) return (
    <div className="p-4 text-center text-[var(--c-muted)] text-sm">
      No results for &ldquo;{query}&rdquo;
    </div>
  );
  const handleMouseEnter = (e: React.MouseEvent, section: string, item: SearchResultItem) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setPreviewPos({ top: rect.top });
    setHoveredItem({ section, item });
  };
  return (
    <div className="relative">
      <div className="max-h-[72vh] overflow-y-auto py-2">
        {visibleSections.map(section => {
          const items = (data[section.key] ?? []) as SearchResultItem[];
          const Icon  = section.icon;
          return (
            <div key={section.key}>
              <div className="flex items-center gap-2 px-4 py-1.5">
                <Icon size={11} className={`${section.accentClass} opacity-70`} />
                <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--c-muted)] opacity-60">{section.label}</span>
                <span className="ml-auto text-[9px] text-[var(--c-muted)] opacity-40">{items.length}</span>
              </div>
              {items.map((item, idx) => (
                <button key={idx} onClick={() => {
                    const route = section.getRoute ? section.getRoute(item) : section.route;
                    if (route) { onNavigate(route); onClose(); }
                  }}
                  onMouseEnter={e => handleMouseEnter(e, section.key, item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-[var(--c-surface2)] transition-colors">
                  {/* Use section.renderRow for proper typed rendering */}
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    {section.renderRow(item, query)}
                  </div>
                  <MdChevronRight size={14} className="text-[var(--c-muted)] flex-shrink-0" />
                </button>
              ))}
            </div>
          );
        })}
      </div>
      <AnimatePresence>
        {hoveredItem && (() => {
          const section = SEARCH_SECTIONS.find(s => s.key === hoveredItem.section);
          if (!section?.renderPreview) return null;
          return (
            <motion.div key="preview"
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              className="fixed w-72 rounded-2xl shadow-2xl overflow-hidden pointer-events-none"
              style={{
                top: Math.min(previewPos.top, (typeof window !== "undefined" ? window.innerHeight : 600) - 400),
                right: "calc(20rem + 12px)", height: 360, zIndex: 99999,
                background: "var(--dropdown-bg)", border: "1px solid var(--c-border)",
              }}>
              {section.renderPreview(hoveredItem.item)}
            </motion.div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}

// ── Main Navbar ───────────────────────────────────────────────────────────────
export default function Navbar({ user, onMenuClick, onToggleSidebar }: NavbarProps) {
  const [searchQ,      setSearchQ]      = useState("");
  const [searchFocus,  setSearchFocus]  = useState(false);
  const [results,      setResults]      = useState<SearchData | null>(null);
  const [searching,    setSearching]    = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const [searchLabel,  setSearchLabel]  = useState("F"); // dynamic from shortcuts

  const searchRef      = useRef<HTMLDivElement>(null);
  const inputRef       = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const debounce       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router         = useRouter();

  // Load shortcuts and set search placeholder label — also listen for live updates
  useEffect(() => {
    const refresh = () => {
      const sc = loadShortcuts(user?.id);
      setSearchLabel(inlineShortcut(sc.focusSearch));
    };
    refresh();
    window.addEventListener("saturn-shortcuts-updated", refresh);
    return () => window.removeEventListener("saturn-shortcuts-updated", refresh);
  }, []);

  // Keyboard shortcuts (dynamic, loaded from localStorage)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag    = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;

      const sc = loadShortcuts(user?.id);

      if (!typing && matchesShortcut(e, sc.toggleSidebar)) {
        e.preventDefault(); onToggleSidebar?.();
      }
      if (!typing && matchesShortcut(e, sc.focusSearch)) {
        e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 50);
      }
      // Allow Ctrl+F even when typing (override browser find)
      if (sc.focusSearch.includes('ctrl') && matchesShortcut(e, sc.focusSearch)) {
        e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === "Escape") {
        setSearchQ(""); setResults(null); setSearchFocus(false); setMobileSearch(false);
        (e.target as HTMLElement)?.blur?.();
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onToggleSidebar]);

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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  useEffect(() => {
    if (mobileSearch) setTimeout(() => mobileInputRef.current?.focus(), 80);
  }, [mobileSearch]);

  const clearSearch = () => { setSearchQ(""); setResults(null); };
  const showDrop    = searchFocus && searchQ.length >= 2;
  const hasResults  = results && (Object.values(results) as SearchResultItem[][]).some(arr => arr.length > 0);

  const handleNavigate = (route: string) => {
    if (!route) return;
    clearSearch(); setSearchFocus(false); setMobileSearch(false);
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

        {/* ── Desktop Search ── */}
        <div ref={searchRef} className="relative hidden md:block">
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
              title={`Search (${searchLabel})`}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setSearchQ(e.target.value); setSearchFocus(true); }}
              onFocus={() => setSearchFocus(true)}
              onBlur={() => { setTimeout(() => setSearchFocus(false), 200); }}
              placeholder={`Search… (${searchLabel})`}
              className="h-9 rounded-xl pl-9 pr-8 text-sm font-nunito focus:outline-none transition-all duration-200 w-40 focus:w-64"
              style={{ background: "var(--c-input-bg)", border: "1px solid var(--c-input-border)", color: "var(--c-text)" }}
            />
            {searchQ && (
              <button onClick={clearSearch} className="absolute right-2.5 text-[var(--c-muted)] hover:text-[var(--c-text)] transition-colors">
                <MdClose size={13} />
              </button>
            )}
          </div>

          <AnimatePresence>
            {showDrop && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{    opacity: 0, y: 6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                onMouseDown={(e: React.MouseEvent) => e.preventDefault()}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl z-[9000] shadow-2xl overflow-hidden"
                style={{ background: "var(--dropdown-bg)", border: "1px solid var(--c-border)" }}
              >
                {searching && !results ? (
                  <div className="p-4 text-center text-[var(--c-muted)] text-sm italic">Searching…</div>
                ) : (
                  <SearchResults data={results ?? {}} query={searchQ} onClose={clearSearch} onNavigate={handleNavigate} />
                )}
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

        {/* ── Mobile Search Button ── */}
        <button
          onClick={() => setMobileSearch(true)}
          className="md:hidden p-2 rounded-xl text-[var(--c-muted)] hover:text-[var(--c-text)] hover:bg-[var(--c-surface)] transition-colors"
          aria-label="Search"
          title="Search"
        >
          <MdSearch size={22} />
        </button>
      </header>

      {/* ── Mobile Search Overlay ── */}
      <AnimatePresence>
        {mobileSearch && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex flex-col md:hidden"
            style={{ background: "var(--c-bg)" }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "var(--c-border)", background: "var(--navbar-bg)" }}>
              <div className="relative flex-1">
                <div className="absolute left-0 inset-y-0 flex items-center pl-3 pointer-events-none">
                  {searching
                    ? <div className="w-4 h-4 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                    : <MdSearch className="text-[var(--c-muted)]" size={18} />}
                </div>
                <input
                  ref={mobileInputRef}
                  type="text"
                  value={searchQ}
                  autoComplete="off"
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQ(e.target.value)}
                  placeholder="Cari fitur, pengguna, halaman…"
                  className="w-full h-11 rounded-xl pl-10 pr-10 text-sm font-nunito focus:outline-none"
                  style={{ background: "var(--c-surface)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                />
                {searchQ && (
                  <button onClick={clearSearch} className="absolute right-3 inset-y-0 flex items-center text-[var(--c-muted)]">
                    <MdClose size={16} />
                  </button>
                )}
              </div>
              <button
                onClick={() => { setMobileSearch(false); clearSearch(); }}
                className="text-sm font-semibold flex-shrink-0"
                style={{ color: "var(--c-accent)" }}
              >
                Batal
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {searchQ.length < 2 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-20">
                  <MdSearch size={48} className="opacity-10" style={{ color: "var(--c-text)" }} />
                  <p className="text-sm text-[var(--c-muted)]">Ketik minimal 2 karakter untuk mencari</p>
                </div>
              ) : searching && !results ? (
                <div className="flex items-center justify-center gap-2 py-16 text-[var(--c-muted)]">
                  <div className="w-5 h-5 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
                  <span className="text-sm">Mencari…</span>
                </div>
              ) : (
                <SearchResults
                  data={results ?? {}}
                  query={searchQ}
                  onClose={() => { setMobileSearch(false); clearSearch(); }}
                  onNavigate={handleNavigate}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
