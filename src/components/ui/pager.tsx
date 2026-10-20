"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "./field";

/** Navegação entre páginas de uma lista paginada no servidor (links, para funcionar sem JavaScript e poder ser partilhada). */
export function Pager({ page, pages, hrefFor, className }: { page: number; pages: number; hrefFor: (p: { pagina: number }) => string; className?: string }) {
  if (pages <= 1) return null;
  // 1 … 4 5 [6] 7 8 … 20
  const nums = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const item = "inline-flex h-11 min-w-11 items-center justify-center rounded-xl px-3 text-[15px] font-semibold transition-colors";
  return (
    <nav aria-label="Páginas" className={cn("flex flex-wrap items-center justify-center gap-1", className)}>
      {page > 1 ? (
        <Link href={hrefFor({ pagina: page - 1 })} scroll={false} className={cn(item, "text-ink-700 hover:bg-ink-100")} aria-label="Página anterior">
          <ChevronLeft className="size-5" />
        </Link>
      ) : (
        <span className={cn(item, "text-ink-300")} aria-hidden><ChevronLeft className="size-5" /></span>
      )}
      {nums.map((n, i) => (
        <span key={n} className="contents">
          {i > 0 && n - nums[i - 1] > 1 && <span className="px-1 text-ink-400">…</span>}
          <Link
            href={hrefFor({ pagina: n })}
            scroll={false}
            aria-current={n === page ? "page" : undefined}
            className={cn(item, n === page ? "bg-ink-900 text-white" : "text-ink-700 hover:bg-ink-100")}
          >
            {n}
          </Link>
        </span>
      ))}
      {page < pages ? (
        <Link href={hrefFor({ pagina: page + 1 })} scroll={false} className={cn(item, "text-ink-700 hover:bg-ink-100")} aria-label="Página seguinte">
          <ChevronRight className="size-5" />
        </Link>
      ) : (
        <span className={cn(item, "text-ink-300")} aria-hidden><ChevronRight className="size-5" /></span>
      )}
    </nav>
  );
}

/** Caixa de pesquisa que só pede ao servidor quando a pessoa pára de escrever. */
export function SearchBox({ value, onSearch, placeholder, label, className }: { value: string; onSearch: (q: string) => void; placeholder: string; label: string; className?: string }) {
  const [q, setQ] = useState(value);
  const last = useRef(value);
  // Acompanha mudanças vindas de fora (ex.: "Limpar filtros")
  useEffect(() => {
    if (value !== last.current) setQ(value);
    last.current = value;
  }, [value]);
  useEffect(() => {
    if (q.trim() === value.trim()) return;
    const t = setTimeout(() => {
      last.current = q.trim();
      onSearch(q.trim());
    }, 350);
    return () => clearTimeout(t);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-400" aria-hidden />
      <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className="pr-11 pl-11" aria-label={label} />
      {q && (
        <button
          type="button"
          onClick={() => {
            setQ("");
            last.current = "";
            onSearch("");
          }}
          className="absolute top-1/2 right-2 flex size-9 -translate-y-1/2 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
          aria-label="Limpar pesquisa"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}
