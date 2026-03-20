/**
 * searchRegistry.tsx  ─  Saturn Dashboard Search Registry
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * HOW IT WORKS:
 *   The Navbar reads this registry to know:
 *   • What sections to show in search results
 *   • How to render each result row
 *   • How to render the hover preview card
 *   • Which route to navigate to on click (with ?highlight=ID)
 *
 * ── HOW TO ADD A NEW SECTION (e.g. "Tasks") ─────────────────────────────
 *
 *  STEP 1 — Register it here:
 *    Add an entry to SEARCH_SECTIONS below following the pattern.
 *    Key things to fill:
 *      key         → matches the key in your /api/search response (e.g. "tasks")
 *      route       → the dashboard route (e.g. "/dashboard/tasks")
 *      renderRow   → JSX for the compact search result row
 *      renderPreview → JSX for the full-width hover preview panel
 *
 *  STEP 2 — Update /api/search/route.ts:
 *    In the GET handler, query your new data and add it to the response:
 *      const tasks = getTasksMatchingQuery(q).slice(0, 5);
 *      return NextResponse.json({ success: true, data: { notes, users, tasks } });
 *
 *  STEP 3 — Add highlight support (optional but recommended):
 *    In your new page's page.tsx server component, pass searchParams.highlight:
 *      export default async function TasksPage({ searchParams }: { searchParams: { highlight?: string } }) {
 *        ...
 *        return <TasksClient highlightId={searchParams?.highlight} ... />;
 *      }
 *    Then in your client component, find the item with that ID and add
 *    the highlight animation (see NotesClient.tsx for reference).
 *
 *  That's it! The Navbar will automatically show the new section.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Image from 'next/image';
import { MdNotes, MdPeople, MdTag, MdPerson, MdBlock, MdCheckCircle, MdVisibilityOff, MdPushPin } from 'react-icons/md';

// ── Type Definitions ─────────────────────────────────────────────────────

export interface SearchResultItem {
  id: string;
  [key: string]: unknown;
}

export interface SearchSection<T extends SearchResultItem = SearchResultItem> {
  /** Matches the key in /api/search response JSON  */
  key: string;
  /** Display name shown as group header             */
  label: string;
  /** Icon component (from react-icons)              */
  icon: React.ElementType;
  /** Base route — without highlight param           */
  route: string;
  /** Accent color for group header (Tailwind class) */
  accentClass: string;
  /**
   * Returns the URL to navigate to when this result is clicked.
   * Always includes ?highlight=ID so the page can scroll+highlight.
   */
  getRoute: (item: T) => string;
  /**
   * Renders the compact row inside the search dropdown.
   * Receive query so you can highlight matching text.
   */
  renderRow: (item: T, query: string) => React.ReactNode;
  /**
   * Renders the full-size hover preview card shown to the left
   * of the dropdown when user hovers over a result.
   */
  renderPreview: (item: T) => React.ReactNode;
}

// ── Text highlight helper ─────────────────────────────────────────────────
export function HighlightText({ text, query, className = '' }: { text?: string; query: string; className?: string }) {
  const safe = text ?? '';
  if (!query || query.length < 2) return <span className={className}>{safe}</span>;
  const parts = safe.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return (
    <span className={className}>
      {parts.map((p: string, i: number) =>
        p.toLowerCase() === query.toLowerCase()
          ? <mark key={i} className="bg-violet-500/30 text-violet-200 rounded px-0.5 not-italic">{p}</mark>
          : p
      )}
    </span>
  );
}

// ── Note types (subset of what /api/search returns) ──────────────────────
export interface NoteResult extends SearchResultItem {
  title:      string;
  content:    string;
  authorName: string;
  authorRole: string;
  color:      string;
  hidden:     boolean;
  pinned?:    boolean;
  tags?:      string[];
}

const NOTE_DOT: Record<string, string> = {
  violet: 'bg-violet-500', cyan: 'bg-cyan-500', pink: 'bg-pink-500',
  amber:  'bg-amber-500',  teal: 'bg-teal-500', blue: 'bg-blue-500',
};
const NOTE_BORDER: Record<string, string> = {
  violet: 'border-l-violet-500', cyan: 'border-l-cyan-500', pink: 'border-l-pink-500',
  amber:  'border-l-amber-500',  teal: 'border-l-teal-500', blue: 'border-l-blue-500',
};
const NOTE_TEXT: Record<string, string> = {
  violet: 'text-violet-400', cyan: 'text-cyan-400', pink: 'text-pink-400',
  amber:  'text-amber-400',  teal: 'text-teal-400', blue: 'text-blue-400',
};

// ── User types ────────────────────────────────────────────────────────────
export interface UserResult extends SearchResultItem {
  username:    string;
  displayName: string;
  role:        string;
  avatar:      string;
  email:       string;
  phone?:      string;
  bio?:        string;
  banned:      boolean;
  createdAt?:  string;
}

const ROLE_CLR: Record<string, string> = {
  owner: 'text-amber-400', admin: 'text-cyan-400',
  developer: 'text-violet-400', user: 'text-slate-400',
};
const ROLE_BG: Record<string, string> = {
  owner: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
  admin: 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400',
  developer: 'bg-violet-500/10 border-violet-500/30 text-violet-400',
  user: 'bg-slate-500/10 border-slate-500/30 text-slate-400',
};

// ═══════════════════════════════════════════════════════════════════════════
// SEARCH SECTIONS — add new entries here to extend search
// ═══════════════════════════════════════════════════════════════════════════

export const SEARCH_SECTIONS: SearchSection[] = [

  // ── NOTES ──────────────────────────────────────────────────────────────
  {
    key:         'notes',
    label:       'Notes',
    icon:        MdNotes,
    route:       '/dashboard/notes',
    accentClass: 'text-violet-400',
    getRoute:    (item) => `/dashboard/notes?highlight=${item.id}`,

    renderRow: (item, query) => {
      const n = item as NoteResult;
      return (
        <div className="flex items-center gap-3 w-full min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${NOTE_DOT[n.color] || 'bg-violet-500'}`} />
          <div className="flex-1 min-w-0">
            <HighlightText text={n.title} query={query}
              className="text-[var(--c-text)] text-sm font-semibold block truncate" />
            <HighlightText text={`@${n.authorName}`} query={query}
              className="text-[var(--c-muted)] text-xs block truncate" />
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {n.pinned  && <MdPushPin  size={11} className="text-amber-400" />}
            {n.hidden  && <MdVisibilityOff size={11} className="text-slate-500" />}
          </div>
        </div>
      );
    },

    renderPreview: (item) => {
      const n = item as NoteResult;
      return (
        <div className={`flex flex-col h-full border-l-4 ${NOTE_BORDER[n.color] || 'border-l-violet-500'}`}>
          <div className="p-4 flex-1 overflow-y-auto">
            {/* Header */}
            <div className="flex items-start gap-2 mb-3">
              <span className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${NOTE_DOT[n.color] || 'bg-violet-500'}`} />
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm leading-tight ${NOTE_TEXT[n.color] || 'text-violet-400'}`}>{n.title}</h3>
                <p className="text-[var(--c-muted)] text-[10px] font-mono mt-0.5">@{n.authorName} · {n.authorRole}</p>
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-1.5 mb-3 flex-wrap">
              {n.hidden && (
                <span className="flex items-center gap-1 text-[9px] bg-slate-700/50 text-slate-400 px-1.5 py-0.5 rounded-full">
                  <MdVisibilityOff size={9} /> Hidden
                </span>
              )}
              {n.pinned && (
                <span className="flex items-center gap-1 text-[9px] bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded-full">
                  <MdPushPin size={9} className="rotate-45" /> Pinned
                </span>
              )}
            </div>

            {/* Content */}
            {n.content ? (
              <p className="text-[var(--c-text)] text-xs leading-relaxed whitespace-pre-wrap line-clamp-8 mb-3">
                {n.content}
              </p>
            ) : (
              <p className="text-[var(--c-muted)] text-xs italic mb-3">No content</p>
            )}

            {/* Tags */}
            {(n.tags ?? []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {(n.tags ?? []).map(tag => (
                  <span key={tag} className="flex items-center gap-1 text-[9px] bg-white/5 text-[var(--c-muted)] px-2 py-0.5 rounded-full">
                    <MdTag size={9} /> {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t text-[10px] text-[var(--c-muted)] font-mono flex items-center justify-between"
            style={{ borderColor: 'var(--c-border)' }}>
            <span>Click to open →</span>
            <span className={`font-bold capitalize ${NOTE_TEXT[n.color] || 'text-violet-400'}`}>{n.color}</span>
          </div>
        </div>
      );
    },
  },

  // ── USERS ───────────────────────────────────────────────────────────────
  {
    key:         'users',
    label:       'Users',
    icon:        MdPeople,
    route:       '/dashboard/users',
    accentClass: 'text-cyan-400',
    getRoute:    (item) => `/dashboard/users?highlight=${item.id}`,

    renderRow: (item, query) => {
      const u = item as UserResult;
      const name = u.displayName || u.username;
      return (
        <div className="flex items-center gap-3 w-full min-w-0">
          <div className="w-7 h-7 rounded-lg overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold">
            {u.avatar
              ? <Image src={u.avatar} alt={name} width={28} height={28} className="object-cover w-full h-full" />
              : name[0]?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <HighlightText text={name} query={query}
              className="text-[var(--c-text)] text-sm font-semibold block truncate" />
            <HighlightText text={`@${u.username}`} query={query}
              className="text-[var(--c-muted)] text-xs block truncate" />
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {u.banned
              ? <MdBlock size={12} className="text-red-400" />
              : <MdCheckCircle size={12} className="text-emerald-400" />}
            <span className={`text-[10px] font-bold uppercase ${ROLE_CLR[u.role] || 'text-violet-400'}`}>{u.role}</span>
          </div>
        </div>
      );
    },

    renderPreview: (item) => {
      const u = item as UserResult;
      const name = u.displayName || u.username;
      return (
        <div className="flex flex-col h-full">
          {/* User header */}
          <div className="p-4 border-b" style={{ borderColor: 'var(--c-border)' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-600 to-cyan-600 flex-shrink-0 flex items-center justify-center text-white text-xl font-bold border-2 border-violet-500/30">
                {u.avatar
                  ? <Image src={u.avatar} alt={name} width={56} height={56} className="object-cover w-full h-full" />
                  : name[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-[var(--c-text)] text-sm leading-tight truncate">{name}</h3>
                <p className="text-[var(--c-muted)] text-xs font-mono">@{u.username}</p>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full border capitalize ${ROLE_BG[u.role] || ROLE_BG.user}`}>
                    {u.role}
                  </span>
                  {u.banned
                    ? <span className="flex items-center gap-0.5 text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded-full border border-red-500/20"><MdBlock size={9} /> Banned</span>
                    : <span className="flex items-center gap-0.5 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/20"><MdCheckCircle size={9} /> Active</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
            {[
              ['📧 Email', u.email],
              ['📞 Phone', u.phone],
            ].map(([label, val]) => val ? (
              <div key={String(label)} className="rounded-xl p-2" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-0.5">{label}</p>
                <p className="text-[var(--c-text)] text-xs font-mono truncate">{val}</p>
              </div>
            ) : null)}

            {u.bio && (
              <div className="rounded-xl p-2" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-0.5">💬 Bio</p>
                <p className="text-[var(--c-text)] text-xs leading-relaxed line-clamp-3">{u.bio}</p>
              </div>
            )}

            {u.createdAt && (
              <div className="rounded-xl p-2" style={{ background: 'var(--c-input-bg)', border: '1px solid var(--c-border)' }}>
                <p className="text-[9px] font-bold uppercase tracking-wider text-[var(--c-muted)] mb-0.5">📅 Member Since</p>
                <p className="text-[var(--c-text)] text-xs font-mono">
                  {new Date(u.createdAt).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' })}
                </p>
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 border-t text-[10px] text-[var(--c-muted)] font-mono"
            style={{ borderColor: 'var(--c-border)' }}>
            <span className="flex items-center gap-1"><MdPerson size={11} /> Click to view in Users table</span>
          </div>
        </div>
      );
    },
  },

  // ═══════════════════════════════════════════════════════════════
  // ADD NEW SECTIONS BELOW THIS LINE
  // Copy the structure above and customize for your new data type.
  // Remember to also update /api/search/route.ts
  // ═══════════════════════════════════════════════════════════════
];

/** Map from section key → section config, for O(1) lookup */
export const SEARCH_SECTION_MAP = Object.fromEntries(
  SEARCH_SECTIONS.map(s => [s.key, s])
) as Record<string, SearchSection>;
