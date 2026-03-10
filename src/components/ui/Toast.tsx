"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  useMemo,
} from "react";
import {
  MdCheckCircle,
  MdError,
  MdInfo,
  MdWarning,
  MdClose,
} from "react-icons/md";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
  success: (msg: string) => void;
  error: (msg: string) => void;
  info: (msg: string) => void;
  warning: (msg: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const icons = {
  success: MdCheckCircle,
  error: MdError,
  info: MdInfo,
  warning: MdWarning,
};

const colors = {
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  error: "border-red-500/30 bg-red-500/10 text-red-400",
  info: "border-blue-500/30 bg-blue-500/10 text-blue-400",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  }, []);

  const ctx: ToastContextValue = useMemo(
    () => ({
      toast: addToast,
      success: (msg) => addToast(msg, "success"),
      error: (msg) => addToast(msg, "error"),
      info: (msg) => addToast(msg, "info"),
      warning: (msg) => addToast(msg, "warning"),
    }),
    [addToast],
  );

  {
    /* Testing UI Toast Menggunakan Console */
  }
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).saturnToast = {
        success: ctx.success,
        error: ctx.error,
        info: ctx.info,
        warning: ctx.warning,
      };
    }
  }, [ctx]);

  if (!mounted) return <>{children}</>;

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <div className="fixed top-6 right-6 z-[9999] flex flex-col gap-3">
        {toasts.map((t) => {
          const Icon = icons[t.type];
          return (
            <div
              key={t.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border glass-strong min-w-64 max-w-sm
                animate-slideInRight shadow-xl ${colors[t.type]}`}
            >
              <Icon size={20} className="flex-shrink-0" />
              <p className="font-nunito text-sm text-white flex-1">
                {t.message}
              </p>
              <button
                onClick={() =>
                  setToasts((prev) => prev.filter((x) => x.id !== t.id))
                }
                className="text-slate-500 hover:text-white ml-1"
              >
                <MdClose size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
