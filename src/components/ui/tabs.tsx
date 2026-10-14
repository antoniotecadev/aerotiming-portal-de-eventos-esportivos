"use client";

import { cn } from "@/lib/utils";

export interface TabItem<T extends string> {
  id: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

/** Barra de separadores com scroll horizontal no telemóvel. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem<T>[];
  value: T;
  onChange: (id: T) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn("scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 sm:mx-0 sm:px-0", className)}>
      {items.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-[15px] font-semibold transition-colors [&_svg]:size-4",
              active ? "bg-ink-900 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
            )}
          >
            {t.icon}
            {t.label}
            {t.count !== undefined && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-white/15" : "bg-ink-100 text-ink-600")}>{t.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
