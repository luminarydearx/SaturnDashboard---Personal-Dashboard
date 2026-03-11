"use client";

import {
  useState, useEffect, createContext, useContext, useCallback, useMemo,
} from "react";
import { MdCheckCircle, MdError, MdInfo, MdWarning, MdClose } from "react-icons/md";

type ToastType = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast:   (message: string, type?: ToastType) => void;
  success: (msg: string) => void;
  error:   (msg: string) => void;
  info:    (msg: string) => void;
  warning: (msg: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue | null>(null);

// No-op fallback so useToast never throws even outside a provider
const NOOP_CTX: ToastContextValue = {
  toast:   () => {},
  success: () => {},
  error:   () => {},
  info:    () => {},
  warning: () => {},
};

// ── Style maps ─────────────────────────────────────────────────────────────
const ICONS = { success: MdCheckCircle, error: MdError, info: MdInfo, warning: MdWarning };

const TOAST_STYLES: Record<ToastType, React.CSSProperties> = {
  success: { borderColor: 'rgba(16,185,129,0.35)', background: 'rgba(16,185,129,0.12)', color: '#34d399' },
  error:   { borderColor: 'rgba(239,68,68,0.35)',  background: 'rgba(239,68,68,0.12)',  color: '#f87171' },
  info:    { borderColor: 'rgba(59,130,246,0.35)', background: 'rgba(59,130,246,0.12)', color: '#60a5fa' },
  warning: { borderColor: 'rgba(245,158,11,0.35)', background: 'rgba(245,158,11,0.12)', color: '#fbbf24' },
};

// ── Provider ───────────────────────────────────────────────────────────────
// CRITICAL FIX: Never skip rendering the Provider.
// The old pattern with a mounted-guard was breaking context during hydration.
// context provision during hydration → useToast() got null → error thrown.
// Now: Provider is ALWAYS rendered. Toast DOM is conditionally shown.
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [clientReady, setClientReady] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Mark client-side ready after hydration
  useEffect(() => { setClientReady(true); }, []);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const ctx = useMemo<ToastContextValue>(() => ({
    toast:   addToast,
    success: msg => addToast(msg, "success"),
    error:   msg => addToast(msg, "error"),
    info:    msg => addToast(msg, "info"),
    warning: msg => addToast(msg, "warning"),
  }), [addToast]);

  // Expose to console for debug
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).saturnToast = ctx;
    }
  }, [ctx]);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      {/* Only render toast DOM on client — avoids hydration mismatch */}
      {clientReady && toasts.length > 0 && (
        <div style={{
          position: 'fixed', top: '1.5rem', right: '1.5rem',
          zIndex: 99999, display: 'flex', flexDirection: 'column', gap: '0.75rem',
          pointerEvents: 'none',
        }}>
          {toasts.map(t => {
            const Icon = ICONS[t.type];
            return (
              <div key={t.id} className="animate-slideInRight"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.75rem 1rem', borderRadius: '0.75rem',
                  border: '1px solid', minWidth: '16rem', maxWidth: '22rem',
                  backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                  pointerEvents: 'all',
                  ...TOAST_STYLES[t.type],
                }}>
                <Icon size={20} style={{ flexShrink: 0 }} />
                <p style={{
                  fontFamily: "'Nunito', sans-serif", fontSize: '0.875rem',
                  flex: 1, color: 'var(--c-text)',
                }}>
                  {t.message}
                </p>
                <button
                  onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--c-muted)', padding: '2px', lineHeight: 1,
                  }}
                >
                  <MdClose size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────
// Returns NOOP_CTX instead of throwing when used outside provider.
// This prevents hard crashes during SSR or edge cases.
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  return ctx ?? NOOP_CTX;
}
