"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { MapPin, Search } from "lucide-react";
import { CATEGORIES, PROVINCES } from "@/lib/data";
import type { CategorySlug } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CategoryIcon } from "@/components/events/category-icon";

export function HeroSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [provincia, setProvincia] = useState("");

  const go = (categoria?: CategorySlug) => {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (provincia) params.set("provincia", provincia);
    if (categoria) params.set("categoria", categoria);
    router.push(`/eventos${params.size ? `?${params}` : ""}`);
  };

  return (
    <div className="space-y-5">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          go();
        }}
        className="flex flex-col gap-2 rounded-2xl bg-white p-2 shadow-lift sm:flex-row sm:items-center"
      >
        <label className="flex flex-1 items-center gap-3 rounded-xl px-3 focus-within:bg-ink-50">
          <Search className="size-5 shrink-0 text-ink-400" aria-hidden />
          <span className="sr-only">Nome do evento ou cidade</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Evento, cidade ou distância"
            className="h-12 w-full bg-transparent text-base text-ink-900 placeholder:text-ink-400 focus:outline-none"
          />
        </label>
        <div className="hidden h-8 w-px bg-ink-200 sm:block" aria-hidden />
        <label className="relative flex items-center gap-3 rounded-xl px-3 focus-within:bg-ink-50 sm:w-52">
          <MapPin className="size-5 shrink-0 text-ink-400" aria-hidden />
          <span className="sr-only">Província</span>
          <select value={provincia} onChange={(e) => setProvincia(e.target.value)} className="h-12 w-full appearance-none bg-transparent text-base text-ink-900 focus:outline-none">
            <option value="">Todas as províncias</option>
            {PROVINCES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 text-base font-bold text-white hover:bg-brand-700">
          <Search className="size-5" /> Procurar
        </button>
      </form>

      <div>
        <p className="mb-2.5 text-sm font-semibold text-ink-300">Ou escolha uma modalidade:</p>
        <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {CATEGORIES.map((c) => (
            <button
              key={c.slug}
              onClick={() => go(c.slug)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-[15px] font-semibold text-white backdrop-blur transition-colors hover:border-brand-400 hover:bg-brand-600",
              )}
            >
              <CategoryIcon slug={c.slug} className="size-4.5" />
              {c.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
