"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Menu de secções fixo no topo, que acompanha o scroll. */
export function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState(items[0]?.id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-140px 0px -60% 0px" },
    );
    items.forEach((i) => {
      const el = document.getElementById(i.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [items]);

  return (
    <nav className="sticky top-16 z-30 border-b border-ink-200/70 bg-white/95 backdrop-blur lg:top-18" aria-label="Secções do evento">
      <div className="container-page scrollbar-none flex gap-1 overflow-x-auto py-2">
        {items.map((i) => (
          <a
            key={i.id}
            href={`#${i.id}`}
            className={cn("shrink-0 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors", active === i.id ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-ink-100")}
          >
            {i.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
