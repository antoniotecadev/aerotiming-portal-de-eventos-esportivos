"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import { CATEGORIES, EVENTS, PROVINCES, TODAY, filterEvents, minPrice, type EventFilters } from "@/lib/data";
import { monthName, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { EventCard } from "./event-card";
import { CategoryIcon } from "./category-icon";

const SORTS = { data: "Data mais próxima", recentes: "Adicionados recentemente", preco: "Preço mais baixo" } as const;
type Sort = keyof typeof SORTS;

const ESTADOS = [
  { id: "abertas", label: "Com inscrições abertas" },
  { id: "proximos", label: "Todos os próximos" },
  { id: "terminadas", label: "Já realizados" },
] as const;

function monthsAvailable() {
  const set = new Set(EVENTS.map((e) => e.date.slice(0, 7)));
  return [...set].sort();
}

export function EventsExplorer() {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [qDraft, setQDraft] = useState(sp.get("q") ?? "");

  const q = sp.get("q") ?? "";
  const categoria = sp.get("categoria") ?? "";
  const provincia = sp.get("provincia") ?? "";
  const mes = sp.get("mes") ?? "";
  const estado = (sp.get("estado") ?? "proximos") as "abertas" | "proximos" | "terminadas";
  const ordem = (sp.get("ordem") ?? "data") as Sort;

  const set = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  };

  const list = useMemo(() => {
    const base = estado === "terminadas" ? EVENTS : EVENTS.filter((e) => e.date >= TODAY);
    const f: EventFilters = { q, categoria, provincia, mes, estado: estado === "proximos" ? "todas" : estado };
    const out = filterEvents(base, f);
    return out.sort((a, b) =>
      ordem === "preco" ? minPrice(a) - minPrice(b) : ordem === "recentes" ? b.createdAt.localeCompare(a.createdAt) : estado === "terminadas" ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
    );
  }, [q, categoria, provincia, mes, estado, ordem]);

  const active = [
    q && { key: "q", label: `"${q}"` },
    categoria && { key: "categoria", label: CATEGORIES.find((c) => c.slug === categoria)?.name ?? categoria },
    provincia && { key: "provincia", label: provincia },
    mes && { key: "mes", label: `${monthName(parseDate(`${mes}-01`).getMonth())} ${mes.slice(0, 4)}` },
  ].filter(Boolean) as { key: string; label: string }[];

  const clearAll = () => {
    setQDraft("");
    router.replace(pathname, { scroll: false });
  };

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-bold text-ink-800">Mostrar</p>
        <div className="grid gap-1.5">
          {ESTADOS.map((s) => (
            <label key={s.id} className={cn("flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-[15px] font-medium", estado === s.id ? "border-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300")}>
              <input type="radio" name="estado" className="size-4 accent-brand-600" checked={estado === s.id} onChange={() => set({ estado: s.id === "proximos" ? null : s.id })} />
              {s.label}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-bold text-ink-800">Modalidade</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => set({ categoria: null })} className={cn("rounded-full px-3.5 py-2 text-sm font-semibold", !categoria ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200")}>Todas</button>
          {CATEGORIES.map((c) => (
            <button key={c.slug} onClick={() => set({ categoria: categoria === c.slug ? null : c.slug })} className={cn("inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold", categoria === c.slug ? "bg-ink-900 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200")}>
              <CategoryIcon slug={c.slug} className="size-4" /> {c.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label htmlFor="f-prov" className="mb-2 block text-sm font-bold text-ink-800">Província</label>
        <Select id="f-prov" value={provincia} onChange={(e) => set({ provincia: e.target.value || null })}>
          <option value="">Todas as províncias</option>
          {PROVINCES.map((p) => <option key={p}>{p}</option>)}
        </Select>
      </div>
      <div>
        <label htmlFor="f-mes" className="mb-2 block text-sm font-bold text-ink-800">Mês</label>
        <Select id="f-mes" value={mes} onChange={(e) => set({ mes: e.target.value || null })}>
          <option value="">Qualquer mês</option>
          {monthsAvailable().map((m) => (
            <option key={m} value={m}>{monthName(parseDate(`${m}-01`).getMonth())} {m.slice(0, 4)}</option>
          ))}
        </Select>
      </div>
    </div>
  );

  return (
    <div className="container-page py-8 sm:py-10">
      <form
        role="search"
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          set({ q: qDraft.trim() || null });
        }}
      >
        <label className="flex h-13 flex-1 items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 shadow-sm focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15">
          <Search className="size-5 text-ink-400" />
          <span className="sr-only">Procurar eventos</span>
          <input value={qDraft} onChange={(e) => setQDraft(e.target.value)} placeholder="Nome do evento, cidade ou distância (ex.: 10 km)" className="h-full w-full bg-transparent text-base focus:outline-none" />
          {qDraft && (
            <button type="button" onClick={() => { setQDraft(""); set({ q: null }); }} className="text-ink-400 hover:text-ink-700" aria-label="Limpar pesquisa"><X className="size-5" /></button>
          )}
        </label>
        <Button type="submit" size="lg" className="hidden sm:inline-flex">Procurar</Button>
        <Button variant="outline" size="lg" className="lg:hidden" onClick={() => setFiltersOpen(true)} aria-label="Filtros">
          <SlidersHorizontal /> <span className="hidden sm:inline">Filtros</span>
          {active.length > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-xs text-white">{active.length}</span>}
        </Button>
      </form>

      <div className="mt-8 grid gap-8 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal className="size-4.5" /> Filtros</h2>
              {active.length > 0 && <button onClick={clearAll} className="text-sm font-semibold text-brand-700 hover:underline">Limpar</button>}
            </div>
            {filtersPanel}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] text-ink-600" aria-live="polite">
              <strong className="text-ink-900">{list.length}</strong> {list.length === 1 ? "evento encontrado" : "eventos encontrados"}
            </p>
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="ordem">Ordenar</label>
              <select id="ordem" value={ordem} onChange={(e) => set({ ordem: e.target.value === "data" ? null : e.target.value })} className="h-10 rounded-xl border border-ink-200 bg-white px-3 text-sm font-semibold text-ink-700">
                {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <div className="hidden rounded-xl border border-ink-200 bg-white p-1 sm:flex">
                {([["grid", LayoutGrid, "Grelha"], ["list", List, "Lista"]] as const).map(([v, Icon, label]) => (
                  <button key={v} onClick={() => setView(v)} className={cn("flex size-8 items-center justify-center rounded-lg", view === v ? "bg-ink-900 text-white" : "text-ink-500 hover:bg-ink-100")} aria-label={`Ver em ${label}`} aria-pressed={view === v}>
                    <Icon className="size-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>

          {active.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-2">
              {active.map((a) => (
                <button key={a.key} onClick={() => { if (a.key === "q") setQDraft(""); set({ [a.key]: null }); }} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-800 hover:bg-brand-100">
                  {a.label} <X className="size-3.5" />
                </button>
              ))}
              <button onClick={clearAll} className="px-2 text-sm font-semibold text-ink-500 hover:text-ink-800">Limpar tudo</button>
            </div>
          )}

          {list.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="Não encontrámos eventos"
              description="Experimente outra palavra, escolha outra província ou limpe os filtros para ver todos os eventos."
              action={<Button onClick={clearAll}>Ver todos os eventos</Button>}
            />
          ) : view === "grid" ? (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {list.map((e, i) => <EventCard key={e.id} event={e} priority={i < 3} />)}
            </div>
          ) : (
            <div className="grid gap-4">
              {list.map((e) => <EventCard key={e.id} event={e} layout="horizontal" />)}
            </div>
          )}
        </div>
      </div>

      <Modal
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        title="Filtrar eventos"
        footer={
          <>
            <Button variant="ghost" onClick={clearAll}>Limpar</Button>
            <Button onClick={() => setFiltersOpen(false)}>Ver {list.length} {list.length === 1 ? "evento" : "eventos"}</Button>
          </>
        }
      >
        <div className="p-5">{filtersPanel}</div>
      </Modal>
    </div>
  );
}
