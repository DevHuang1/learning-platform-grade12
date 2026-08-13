"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { cn } from "@/lib/utils";

type Toast = {
  id: number;
  title: string;
  description?: string;
  tone: "success" | "error" | "info";
};

type ToastContextValue = {
  toast: (t: Omit<Toast, "id">) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
};

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
});

const TONES: Record<Toast["tone"], { icon: React.ReactNode; ring: string }> = {
  success: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    ),
    ring: "border-emerald-200 bg-emerald-50 text-emerald-800",
  },
  error: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    ),
    ring: "border-red-200 bg-red-50 text-red-800",
  },
  info: {
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    ),
    ring: "border-indigo-200 bg-indigo-50 text-indigo-800",
  },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((t: Omit<Toast, "id">) => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 4000);
  }, []);

  const success = useCallback(
    (title: string, description?: string) => toast({ title, description, tone: "success" }),
    [toast],
  );
  const error = useCallback(
    (title: string, description?: string) => toast({ title, description, tone: "error" }),
    [toast],
  );
  const info = useCallback(
    (title: string, description?: string) => toast({ title, description, tone: "info" }),
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <button
            key={t.id}
            onClick={() => dismiss(t.id)}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-left shadow-lg backdrop-blur transition-all",
              TONES[t.tone].ring,
            )}
          >
            <span className="mt-0.5 shrink-0">{TONES[t.tone].icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold">{t.title}</span>
              {t.description && (
                <span className="mt-0.5 block text-xs leading-5 opacity-80">
                  {t.description}
                </span>
              )}
            </span>
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}