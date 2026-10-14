"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, Info, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "info" | "error";
interface ToastItem {
  id: number;
  title: string;
  description?: string;
  tone: ToastTone;
}

const ToastContext = createContext<(t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((t: Omit<ToastItem, "id" | "tone"> & { tone?: ToastTone }) => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, tone: t.tone ?? "success", ...t }]);
    setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4500);
  }, []);

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[90] flex flex-col items-center gap-2 px-4 sm:bottom-6 sm:items-end sm:px-6" aria-live="polite">
        {items.map((t) => {
          const Icon = t.tone === "success" ? CheckCircle2 : t.tone === "error" ? TriangleAlert : Info;
          return (
            <div key={t.id} className="pointer-events-auto flex w-full max-w-sm animate-pop-in items-start gap-3 rounded-2xl bg-ink-900 p-4 text-white shadow-lift">
              <Icon className={cn("mt-0.5 size-5 shrink-0", t.tone === "success" ? "text-emerald-400" : t.tone === "error" ? "text-red-400" : "text-sky-400")} />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{t.title}</p>
                {t.description && <p className="mt-0.5 text-sm text-ink-300">{t.description}</p>}
              </div>
              <button onClick={() => setItems((p) => p.filter((x) => x.id !== t.id))} className="text-ink-400 hover:text-white" aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
