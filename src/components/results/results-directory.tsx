"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronRight, Flag, MapPin, RotateCcw, Search, SearchX, Trophy, UserSearch } from "lucide-react";
import type { Category, CategorySlug } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox } from "@/components/ui/pager";
import { useUrlFilters } from "@/lib/use-url-filters";
import { CATEGORY_TONE, CategoryIcon } from "@/components/events/category-icon";

export interface ResultEventSummary {
  slug: string;
  title: string;
  poster: string;
  date: string;
  category: CategorySlug;
  categoryName: string;
  venue: string;
  city: string;
  province: string;
  finishers: number;
  distances: string[];
}

export interface ResultIndexItem {
  name: string;
  bib: string;
  eventSlug: string;
  eventTitle: string;
  distanceId: string;
  distanceName: string;
  chipTime: string | null;
  position: number | null;
}

export const normText = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Caixa "Procurar o meu resultado": pesquisa no servidor (5.10) por nome ou dorsal em todas as provas publicadas. */
export function FindMyResult({ matches }: { matches: ResultIndexItem[] }) {
  const { params, set, pending } = useUrlFilters();
  const q = params.get("procurar") ?? "";
  const term = q.trim();

  return (
    <div className="rounded-2xl bg-white p-4 text-ink-900 shadow-lift sm:p-6">
      <div className="flex items-center gap-3">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          <UserSearch className="size-6" />
        </span>
        <div>
          <h2 className="text-lg font-bold">Procurar o meu resultado</h2>
          <p className="text-sm text-ink-500">Escreva o seu nome ou o número do dorsal.</p>
        </div>
      </div>
      <div className="mt-4" role="search">
        <SearchBox value={q} onSearch={(v) => set({ procurar: v })} placeholder="Ex.: Carlos Mendonça ou 3421" label="Nome ou dorsal" />
      </div>
      {term && (
        <div className={cn("mt-3 transition-opacity", pending && "opacity-60")} aria-live="polite">
          {matches.length === 0 ? (
            <p className="rounded-xl bg-ink-50 px-4 py-3 text-sm text-ink-600">
              {pending ? "A procurar…" : term.length < 2 && !/^d+$/.test(term) ? "Escreva pelo menos 2 letras." : "Não encontrámos ninguém com esse nome ou dorsal. Confirme a escrita e tente de novo."}
            </p>
          ) : (
            <ul className="divide-y divide-ink-100 rounded-xl border border-ink-100">
              {matches.map((r) => (
                <li key={`${r.eventSlug}-${r.bib}`}>
                  <Link
                    href={`/resultados/${r.eventSlug}?distancia=${encodeURIComponent(r.distanceId)}&q=${encodeURIComponent(r.bib)}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-50"
                  >
                    <span className="tabular flex h-9 min-w-12 items-center justify-center rounded-lg bg-ink-900 px-2 text-sm font-bold text-white">{r.bib}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{r.name}</span>
                      <span className="block truncate text-sm text-ink-500">{r.eventTitle} · {r.distanceName}</span>
                    </span>
                    <span className="text-right">
                      <span className="tabular block font-bold">{r.chipTime ?? "—"}</span>
                      <span className="block text-xs text-ink-500">{r.position ? `${r.position}.º lugar` : "Sem tempo"}</span>
                    </span>
                    <ChevronRight className="size-5 shrink-0 text-ink-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Lista de provas com resultados, com pesquisa e filtros. */
export function ResultsDirectory({ events, categories }: { events: ResultEventSummary[]; categories: Category[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [year, setYear] = useState("");

  const years = useMemo(() => [...new Set(events.map((e) => e.date.slice(0, 4)))].sort().reverse(), [events]);
  const usedCategories = categories.filter((c) => events.some((e) => e.category === c.slug));

  const term = normText(q.trim());
  const list = events.filter(
    (e) =>
      (!term || normText(`${e.title} ${e.city} ${e.province}`).includes(term)) &&
      (!category || e.category === category) &&
      (!year || e.date.startsWith(year)),
  );
  const hasFilters = Boolean(q || category || year);

  function clear() {
    setQ("");
    setCategory("");
    setYear("");
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:grid-cols-[1fr_200px_160px] sm:p-5">
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-ink-400" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Procurar prova (nome ou cidade)" className="pl-11" aria-label="Procurar prova" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Modalidade">
          <option value="">Todas as modalidades</option>
          {usedCategories.map((c) => (
            <option key={c.slug} value={c.slug}>{c.name}</option>
          ))}
        </Select>
        <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Ano">
          <option value="">Todos os anos</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-ink-600">
          {list.length === 1 ? "1 prova com resultados" : `${list.length} provas com resultados`}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clear}>
            <RotateCcw /> Limpar filtros
          </Button>
        )}
      </div>

      {list.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="Nenhuma prova encontrada"
          description="Não há resultados que correspondam à sua pesquisa. Experimente outro nome ou limpe os filtros."
          action={<Button variant="outline" onClick={clear}><RotateCcw /> Limpar filtros</Button>}
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {list.map((e) => (
            <li key={e.slug} className="flex overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card transition-shadow hover:shadow-lift">
              <Link href={`/resultados/${e.slug}`} className="relative w-28 shrink-0 bg-ink-100 sm:w-36" aria-label={`Ver resultados: ${e.title}`}>
                <Image src={e.poster} alt={`Cartaz: ${e.title}`} fill sizes="144px" className="object-cover object-top" />
              </Link>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5 p-4 sm:p-5">
                <span className={cn("inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", CATEGORY_TONE[e.category])}>
                  <CategoryIcon slug={e.category} className="size-3.5" /> {e.categoryName}
                </span>
                <h3 className="text-lg leading-snug font-bold text-ink-900">
                  <Link href={`/resultados/${e.slug}`} className="hover:text-brand-700">{e.title}</Link>
                </h3>
                <ul className="space-y-1 text-[15px] text-ink-600">
                  <li className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-ink-400" />{formatDate(e.date)}</li>
                  <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-ink-400" /><span className="truncate">{e.venue}, {e.city}</span></li>
                  <li className="flex items-center gap-2"><Flag className="size-4 shrink-0 text-ink-400" /><span><strong className="text-ink-900">{e.finishers}</strong> atletas terminaram · {e.distances.join(", ")}</span></li>
                </ul>
                <div className="mt-auto pt-1">
                  <ButtonLink href={`/resultados/${e.slug}`} variant="dark" className="w-full sm:w-auto">
                    <Trophy /> Ver resultados
                  </ButtonLink>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
