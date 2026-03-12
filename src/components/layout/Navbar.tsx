"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { PublicUser } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import {
  MdMenu, MdClose, MdSearch, MdAccessTime, MdChevronRight
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
  const [searchQ,           setSearchQ]           = useState("");
  const [searchFocus,       setSearchFocus]       = useState(false);
  const [results,           setResults]           = useState<SearchData | null>(null);
  const [searching,         setSearching]         = useState(false);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const debounce  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router    = useRouter();


  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if (!typing && e.key === "/") { e.preventDefault(); onToggleSidebar?.(); }
      if (!typing && (e.key === "f" || e.key === "F")) { e.preventDefault(); setTimeout(() => inputRef.current?.focus(), 50); }
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
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchFocus(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);


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

        {/* Profile moved to Sidebar */}
      </header>
    </>
  );
}
