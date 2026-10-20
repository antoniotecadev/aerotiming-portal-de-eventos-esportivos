"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { CalendarDays, CalendarRange, ChevronLeft, ChevronRight, List, MapPin, RotateCcw, SearchX } from "lucide-react";
import type { Category, CategorySlug, SportsEvent } from "@/lib/types";
import { dateParts, formatDate, formatDateShort, monthName, parseDate, WEEKDAYS_SHORT } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { EventCard } from "@/components/events/event-card";
import { CATEGORY_TONE, CategoryIcon } from "@/components/events/category-icon";

// Cor sólida por categoria (pontos do calendário)
const CATEGORY_DOT: Record<CategorySlug, string> = {
  corrida: "bg-brand-500",
  caminhada: "bg-pink-500",
  ciclismo: "bg-emerald-500",
  btt: "bg-lime-600",
  trail: "bg-amber-500",
  triatlo: "bg-sky-500",
};

// Semana começa à segunda-feira
const WEEK = [...WEEKDAYS_SHORT.slice(1), WEEKDAYS_SHORT[0]];

const pad = (n: number) => String(n).padStart(2, "0");
const isoOf = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const monthKey = (y: number, m: number) => `${y}-${pad(m + 1)}`;

type View = "mes" | "lista";

export function EventCalendar({ events, today, categories }: { events: SportsEvent[]; today: string; categories: Category[] }) {
  const t = parseDate(today);
  const [year, setYear] = useState(t.getFullYear());
  const [month, setMonth] = useState(t.getMonth());
  const [selected, setSelected] = useState(today);
  const [view, setView] = useState<View>("mes");
  const [category, setCategory] = useState<CategorySlug | "">("");
  const [province, setProvince] = useState("");
  const dayPanelRef = useRef<HTMLDivElement>(null);

  const provinces = useMemo(() => [...new Set(events.map((e) => e.province))].sort((a, b) => a.localeCompare(b, "pt")), [events]);

  const filtered = useMemo(
    () =>
      events
        .filter((e) => (!category || e.category === category) && (!province || e.province === province))
        .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime)),
    [events, category, province],
  );

  const byDay = useMemo(() => {
    const map = new Map<string, SportsEvent[]>();
    filtered.forEach((e) => map.set(e.date, [...(map.get(e.date) ?? []), e]));
    return map;
  }, [filtered]);

  const key = monthKey(year, month);
  const monthEvents = filtered.filter((e) => e.date.startsWith(key));
  const selectedEvents = byDay.get(selected) ?? [];
  const upcoming = filtered.filter((e) => e.date >= today && e.status !== "cancelado").slice(0, 4);
  const hasFilters = Boolean(category || province);

  // Próximo mês (depois do actual) que tem eventos — para o estado vazio
  const nextWithEvents = filtered.find((e) => e.date.slice(0, 7) > key);

  function goTo(y: number, m: number) {
    const d = new Date(y, m, 1);
    const ny = d.getFullYear();
    const nm = d.getMonth();
    setYear(ny);
    setMonth(nm);
    const k = monthKey(ny, nm);
    if (today.startsWith(k)) setSelected(today);
    else setSelected(filtered.find((e) => e.date.startsWith(k))?.date ?? isoOf(ny, nm, 1));
  }

  function goToday() {
    setYear(t.getFullYear());
    setMonth(t.getMonth());
    setSelected(today);
  }

  function pickDay(iso: string) {
    setSelected(iso);
    // No telemóvel, leva o utilizador até aos eventos do dia
    if (window.matchMedia("(max-width: 1023px)").matches) {
      requestAnimationFrame(() => dayPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    }
  }

  function clearFilters() {
    setCategory("");
    setProvince("");
  }

  // Células da grelha
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => isoOf(year, month, i + 1))];
  while (cells.length % 7) cells.push(null);

  const isCurrentMonth = today.startsWith(key);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="space-y-4 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:p-5">
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-800">Que tipo de prova procura?</p>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <CategoryChip active={!category} onClick={() => setCategory("")} slug="todas" label="Todas" />
            {categories.map((c) => (
              <CategoryChip key={c.slug} active={category === c.slug} onClick={() => setCategory(c.slug)} slug={c.slug} label={c.name} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-72">
            <label htmlFor="cal-provincia" className="mb-1.5 block text-sm font-semibold text-ink-800">Província</label>
            <Select id="cal-provincia" value={province} onChange={(e) => setProvince(e.target.value)}>
              <option value="">Todas as províncias</option>
              {provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </Select>
          </div>
          {hasFilters && (
            <Button variant="ghost" onClick={clearFilters} className="h-12">
              <RotateCcw /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Barra do mês */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-11" onClick={() => goTo(year, month - 1)} aria-label="Mês anterior">
            <ChevronLeft />
          </Button>
          <h2 className="min-w-40 text-center text-xl font-extrabold text-ink-900 sm:min-w-48 sm:text-2xl" aria-live="polite">
            {monthName(month)} <span className="text-ink-400">{year}</span>
          </h2>
          <Button variant="outline" size="icon" className="size-11" onClick={() => goTo(year, month + 1)} aria-label="Mês seguinte">
            <ChevronRight />
          </Button>
          <Button variant={isCurrentMonth ? "soft" : "outline"} onClick={goToday} className="ml-1">
            <CalendarDays /> Hoje
          </Button>
        </div>
        <div className="flex rounded-xl bg-ink-100 p-1" role="tablist" aria-label="Modo de visualização">
          {(
            [
              { id: "mes", label: "Mês", icon: CalendarRange },
              { id: "lista", label: "Lista", icon: List },
            ] as const
          ).map((v) => (
            <button
              key={v.id}
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              className={cn(
                "inline-flex h-10 items-center gap-2 rounded-lg px-4 text-[15px] font-semibold transition-colors",
                view === v.id ? "bg-white text-ink-900 shadow-sm" : "text-ink-600 hover:text-ink-900",
              )}
            >
              <v.icon className="size-4" /> {v.label}
            </button>
          ))}
        </div>
      </div>

      <p className="-mt-3 text-sm text-ink-500">
        {monthEvents.length === 0
          ? "Sem eventos neste mês."
          : monthEvents.length === 1
            ? "1 evento neste mês."
            : `${monthEvents.length} eventos neste mês.`}
      </p>

      {view === "mes" ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
          <div>
            <div className="overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card">
              <div className="grid grid-cols-7 border-b border-ink-100 bg-ink-50">
                {WEEK.map((w, i) => (
                  <div key={w} className={cn("py-2.5 text-center text-xs font-bold tracking-wide uppercase sm:text-sm", i >= 5 ? "text-brand-700" : "text-ink-500")}>
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {cells.map((iso, i) => {
                  if (!iso) return <div key={`v${i}`} className="min-h-14 border-r border-b border-ink-100 bg-ink-50/50 sm:min-h-28 [&:nth-child(7n)]:border-r-0" />;
                  const dayEvents = byDay.get(iso) ?? [];
                  const isToday = iso === today;
                  const isSel = iso === selected;
                  const isPast = iso < today;
                  const n = parseDate(iso).getDate();
                  return (
                    <button
                      key={iso}
                      onClick={() => pickDay(iso)}
                      aria-pressed={isSel}
                      aria-label={`${formatDate(iso)}${dayEvents.length ? `, ${dayEvents.length} ${dayEvents.length === 1 ? "evento" : "eventos"}` : ", sem eventos"}`}
                      className={cn(
                        "relative flex min-h-14 flex-col items-center gap-1 border-r border-b border-ink-100 p-1 text-left transition-colors sm:min-h-28 sm:items-stretch sm:p-2 [&:nth-child(7n)]:border-r-0",
                        isSel ? "bg-brand-50 ring-2 ring-brand-500 ring-inset" : dayEvents.length ? "hover:bg-ink-50" : "hover:bg-ink-50/70",
                      )}
                    >
                      <span
                        className={cn(
                          "tabular flex size-8 items-center justify-center rounded-full text-sm font-semibold",
                          isToday ? "bg-brand-600 text-white" : dayEvents.length ? "text-ink-900 font-bold" : isPast ? "text-ink-300" : "text-ink-500",
                        )}
                      >
                        {n}
                      </span>
                      {/* Telemóvel: pontos */}
                      {dayEvents.length > 0 && (
                        <span className="flex flex-wrap justify-center gap-1 sm:hidden">
                          {dayEvents.slice(0, 3).map((e) => (
                            <span key={e.id} className={cn("size-2 rounded-full", CATEGORY_DOT[e.category])} />
                          ))}
                        </span>
                      )}
                      {/* Ecrãs maiores: etiquetas com o nome */}
                      <span className="hidden min-w-0 flex-col gap-1 sm:flex">
                        {dayEvents.slice(0, 2).map((e) => (
                          <span key={e.id} className={cn("flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-[11px] leading-tight font-semibold", CATEGORY_TONE[e.category])}>
                            <CategoryIcon slug={e.category} className="size-3 shrink-0" />
                            <span className="truncate">{e.title}</span>
                          </span>
                        ))}
                        {dayEvents.length > 2 && <span className="px-1 text-[11px] font-semibold text-ink-500">+{dayEvents.length - 2} mais</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Legenda */}
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-ink-600" aria-label="Legenda">
              <li className="flex items-center gap-2">
                <span className="flex size-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">{t.getDate()}</span> Hoje
              </li>
              {categories.map((c) => (
                <li key={c.slug} className="flex items-center gap-1.5">
                  <span className={cn("size-2.5 rounded-full", CATEGORY_DOT[c.slug])} /> {c.name}
                </li>
              ))}
            </ul>
          </div>

          {/* Eventos do dia escolhido */}
          <div ref={dayPanelRef} className="min-w-0 scroll-mt-24 lg:sticky lg:top-24 lg:self-start">
            <div className="mb-3 flex items-center gap-3">
              <DateBlock iso={selected} />
              <div>
                <p className="text-sm font-semibold text-brand-700">{selected === today ? "Hoje" : "Dia escolhido"}</p>
                <h3 className="text-lg font-bold text-ink-900">{formatDateShort(selected)}</h3>
              </div>
            </div>
            {selectedEvents.length > 0 ? (
              <div className="space-y-4">
                {selectedEvents.map((e) => (
                  <EventCard key={e.id} event={e} layout="horizontal" />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-2xl border border-dashed border-ink-300 bg-white px-5 py-6 text-center">
                  <p className="font-semibold text-ink-900">Não há eventos neste dia.</p>
                  <p className="mt-1 text-sm text-ink-600">Toque num dia com cor no calendário para ver os eventos.</p>
                </div>
                <UpcomingList events={upcoming} onClear={hasFilters ? clearFilters : undefined} />
              </div>
            )}
          </div>
        </div>
      ) : monthEvents.length > 0 ? (
        <div className="space-y-8">
          {[...new Set(monthEvents.map((e) => e.date))].map((iso) => (
            <section key={iso} aria-label={formatDate(iso)}>
              <div className="mb-3 flex items-center gap-3">
                <DateBlock iso={iso} />
                <div>
                  {iso === today && <p className="text-sm font-semibold text-brand-700">Hoje</p>}
                  <h3 className="text-lg font-bold text-ink-900">{formatDateShort(iso)}</h3>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {byDay.get(iso)!.map((e) => (
                  <EventCard key={e.id} event={e} layout="horizontal" />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<SearchX />}
          title={`Não há eventos em ${monthName(month)}`}
          description={hasFilters ? "Experimente limpar os filtros ou ver outro mês." : "Ainda não há provas marcadas para este mês. Veja outro mês."}
          action={
            <div className="flex flex-wrap justify-center gap-3">
              {nextWithEvents && (
                <Button onClick={() => goTo(parseDate(nextWithEvents.date).getFullYear(), parseDate(nextWithEvents.date).getMonth())}>
                  Ver {monthName(parseDate(nextWithEvents.date).getMonth())} <ChevronRight />
                </Button>
              )}
              {hasFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  <RotateCcw /> Limpar filtros
                </Button>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}

function CategoryChip({ active, onClick, slug, label }: { active: boolean; onClick: () => void; slug: CategorySlug | "todas"; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[15px] font-semibold transition-colors",
        active ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300 hover:bg-ink-50",
      )}
    >
      <CategoryIcon slug={slug} className="size-4" />
      {label}
    </button>
  );
}

function DateBlock({ iso }: { iso: string }) {
  const { day, month } = dateParts(iso);
  return (
    <div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ink-900 text-white">
      <span className="font-display text-2xl leading-none font-extrabold">{day}</span>
      <span className="text-[11px] font-bold text-sun-400 uppercase">{month}</span>
    </div>
  );
}

function UpcomingList({ events, onClear }: { events: SportsEvent[]; onClear?: () => void }) {
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:p-5">
      <h3 className="text-base font-bold text-ink-900">Próximos eventos</h3>
      {events.length === 0 ? (
        <div className="mt-3 text-sm text-ink-600">
          <p>Não encontrámos próximos eventos com estes filtros.</p>
          {onClear && (
            <Button variant="soft" className="mt-3" onClick={onClear}>
              <RotateCcw /> Limpar filtros
            </Button>
          )}
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-ink-100">
          {events.map((e) => {
            const { day, month } = dateParts(e.date);
            return (
              <li key={e.id}>
                <Link href={`/eventos/${e.slug}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-ink-50">
                  <span className="flex size-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                    <span className="font-display text-xl leading-none font-extrabold">{day}</span>
                    <span className="text-[10px] font-bold uppercase">{month}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink-900">{e.title}</span>
                    <span className="flex items-center gap-1 text-sm text-ink-500">
                      <MapPin className="size-3.5 shrink-0" />
                      <span className="truncate">{e.city}, {e.province}</span>
                    </span>
                  </span>
                  <ChevronRight className="size-5 shrink-0 text-ink-400" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
