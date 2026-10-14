import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ArrowLeft, CalendarDays, Info, MapPin } from "lucide-react";
import { getCategory, getEvent, hasResults, participantsOf, pastEvents, resultsOf } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { PosterViewer } from "@/components/events/poster-lightbox";
import { CATEGORY_TONE, CategoryIcon } from "@/components/events/category-icon";
import { EventResults, type ResultsEventInfo } from "@/components/results/event-results";

export function generateStaticParams() {
  return pastEvents()
    .filter((e) => hasResults(e.slug))
    .map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) return { title: "Resultados não encontrados" };
  return {
    title: `Resultados · ${event.title}`,
    description: `Classificação oficial, pódio e tempos de chip de ${event.title} (${formatDate(event.date)}).`,
  };
}

export default async function EventResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event || !hasResults(slug)) notFound();

  const cat = getCategory(event.category);
  const info: ResultsEventInfo = {
    slug: event.slug,
    title: event.title,
    date: event.date,
    place: `${event.venue}, ${event.city}`,
    distances: event.distances.map((d) => ({ id: d.id, name: d.name, distanceKm: d.distanceKm })),
  };

  return (
    <>
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-600/25 blur-3xl" aria-hidden />
        <div className="container-page relative py-8 sm:py-12">
          <Link href="/resultados" className="inline-flex h-11 items-center gap-2 rounded-xl pr-3 text-sm font-semibold text-ink-300 hover:text-white">
            <ArrowLeft className="size-4" /> Todos os resultados
          </Link>
          <div className="mt-3 flex gap-4 sm:gap-6">
            <PosterViewer src={event.poster} alt={event.title} className="aspect-[1080/1300] w-24 shrink-0 rounded-xl bg-ink-800 shadow-lift sm:w-36" sizes="144px" />
            <div className="min-w-0">
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold", CATEGORY_TONE[event.category])}>
                <CategoryIcon slug={event.category} className="size-3.5" /> {cat.name}
              </span>
              <p className="mt-2 text-sm font-bold tracking-wide text-sun-400 uppercase">Resultados oficiais</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-4xl">{event.title}</h1>
              <ul className="mt-3 space-y-1.5 text-[15px] text-ink-300">
                <li className="flex items-center gap-2"><CalendarDays className="size-4 shrink-0 text-ink-400" />{formatDate(event.date)} · {event.startTime}</li>
                <li className="flex items-center gap-2"><MapPin className="size-4 shrink-0 text-ink-400" /><span>{event.venue}, {event.city} ({event.province})</span></li>
              </ul>
              <ButtonLink href={`/eventos/${event.slug}`} variant="white" size="sm" className="mt-4">
                <Info /> Página do evento
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>
      <div className="container-page py-8 sm:py-10">
        <Suspense fallback={<p className="py-10 text-center text-ink-500">A carregar resultados…</p>}>
          <EventResults event={info} results={resultsOf(slug)} participants={participantsOf(slug)} />
        </Suspense>
      </div>
    </>
  );
}
