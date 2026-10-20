import Image from "next/image";
import Link from "next/link";
import { CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import type { SportsEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import { dateParts, formatDateShort, formatKm, formatKz } from "@/lib/format";
import { isOpen, minPrice, slotsLeft } from "@/lib/event-utils";
import { today } from "@/lib/today";
import { StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CATEGORY_TONE, CategoryIcon } from "./category-icon";

function EventCTA({ event, full }: { event: SportsEvent; full?: boolean }) {
  const base = `/eventos/${event.slug}`;
  if (event.status === "terminado")
    return event.resultsPublished ? (
      <ButtonLink href={`/resultados/${event.slug}`} variant="dark" className={cn(full && "w-full")}>Ver resultados</ButtonLink>
    ) : null;
  if (isOpen(event))
    return (
      <ButtonLink href={`${base}/inscricao`} className={cn(full && "w-full")}>
        <Ticket /> Inscrever-me
      </ButtonLink>
    );
  return null;
}

export function EventCard({ event, layout = "vertical", priority }: { event: SportsEvent; layout?: "vertical" | "horizontal"; priority?: boolean }) {
  const categoryName = event.categoryName ?? event.category;
  const price = minPrice(event, today());
  const href = `/eventos/${event.slug}`;
  const left = slotsLeft(event);
  const { day, month } = dateParts(event.date);
  const open = isOpen(event);

  if (layout === "horizontal") {
    return (
      <article className="group flex overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card transition-shadow hover:shadow-lift">
        <Link href={href} className="relative w-32 shrink-0 bg-ink-100 sm:w-44" aria-label={`Ver detalhes: ${event.title}`}>
          <Image src={event.poster} alt={`Cartaz: ${event.title}`} fill sizes="176px" className="object-cover" />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={event.status} />
            <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", CATEGORY_TONE[event.category])}>
              <CategoryIcon slug={event.category} className="size-3.5" /> {categoryName}
            </span>
          </div>
          <h3 className="text-lg leading-snug font-bold text-ink-900">
            <Link href={href} className="hover:text-brand-700">{event.title}</Link>
          </h3>
          <ul className="space-y-1.5 text-[15px] text-ink-600">
            <li className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-ink-400" />{formatDateShort(event.date)} · {event.startTime}</li>
            <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-ink-400" /><span className="truncate">{event.venue}, {event.city}</span></li>
          </ul>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-1">
            {event.status !== "terminado" && (
              <p className="text-sm text-ink-500">Desde <strong className="text-base text-ink-900">{formatKz(price)}</strong></p>
            )}
            <div className="flex gap-2">
              <ButtonLink href={href} variant="outline" size="sm">Detalhes</ButtonLink>
              {open && <ButtonLink href={`${href}/inscricao`} size="sm">Inscrever-me</ButtonLink>}
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card transition-all hover:-translate-y-0.5 hover:shadow-lift">
      <Link href={href} className="relative block aspect-[1080/1300] overflow-hidden bg-ink-100" aria-label={`Ver detalhes: ${event.title}`}>
        <Image
          src={event.poster}
          alt={`Cartaz: ${event.title}`}
          fill
          priority={priority}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="absolute top-3 left-3 flex flex-col items-center rounded-xl bg-white px-2.5 py-1.5 text-center shadow-md">
          <span className="font-display text-2xl leading-none font-extrabold text-ink-900">{day}</span>
          <span className="text-[11px] font-bold text-brand-600 uppercase">{month}</span>
        </div>
        <div className="absolute top-3 right-3"><StatusBadge status={event.status} className="bg-white shadow-sm" /></div>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5", CATEGORY_TONE[event.category])}>
            <CategoryIcon slug={event.category} className="size-3.5" /> {categoryName}
          </span>
          <span className="truncate text-ink-500">{event.distances.map((d) => formatKm(d.distanceKm)).join(" · ")}</span>
        </div>
        <h3 className="line-clamp-2 text-[17px] leading-snug font-bold text-ink-900">
          <Link href={href} className="hover:text-brand-700">{event.title}</Link>
        </h3>
        <ul className="space-y-1.5 text-sm text-ink-600">
          <li className="flex items-center gap-2"><Clock className="size-4 shrink-0 text-ink-400" />{formatDateShort(event.date)} · {event.startTime}</li>
          <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-ink-400" /><span className="truncate">{event.city}, {event.province}</span></li>
        </ul>
        <div className="mt-auto flex items-end justify-between gap-2 border-t border-ink-100 pt-3">
          {event.status === "terminado" ? (
            <p className="text-sm text-ink-500">Prova realizada</p>
          ) : (
            <div>
              <p className="text-xs text-ink-500">Inscrição desde</p>
              <p className="text-lg font-extrabold text-ink-900">{formatKz(price)}</p>
            </div>
          )}
          {open && left < 600 && <p className="text-right text-xs font-semibold text-amber-700">Restam {left} vagas</p>}
        </div>
        <div className="flex flex-col gap-2">
          <EventCTA event={event} full />
          <ButtonLink href={href} variant="outline" className="w-full">Ver detalhes</ButtonLink>
        </div>
      </div>
    </article>
  );
}
