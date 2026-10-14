import type { Metadata } from "next";
import { getCategory, getEvent, hasResults, pastEvents, RESULTS } from "@/lib/data";
import { formatKm } from "@/lib/format";
import { PageHeader } from "@/components/ui/section-heading";
import { FindMyResult, ResultsDirectory, type ResultEventSummary, type ResultIndexItem } from "@/components/results/results-directory";

export const metadata: Metadata = {
  title: "Resultados",
  description: "Classificações oficiais das provas cronometradas pela AeroTiming. Procure o seu tempo por nome ou dorsal.",
};

export default function ResultsPage() {
  const events: ResultEventSummary[] = pastEvents()
    .filter((e) => hasResults(e.slug))
    .map((e) => ({
      slug: e.slug,
      title: e.title,
      poster: e.poster,
      date: e.date,
      category: e.category,
      categoryName: getCategory(e.category).name,
      venue: e.venue,
      city: e.city,
      province: e.province,
      finishers: RESULTS.filter((r) => r.eventSlug === e.slug && r.status === "terminou").length,
      distances: e.distances.map((d) => formatKm(d.distanceKm)),
    }));

  const index: ResultIndexItem[] = RESULTS.map((r) => {
    const ev = getEvent(r.eventSlug)!;
    return {
      name: r.name,
      bib: r.bib,
      eventSlug: r.eventSlug,
      eventTitle: ev.title,
      distanceId: r.distanceId,
      distanceName: ev.distances.find((d) => d.id === r.distanceId)?.name ?? r.distanceId,
      chipTime: r.chipTime,
      position: r.position,
    };
  });

  return (
    <>
      <PageHeader
        eyebrow="Resultados"
        title="Resultados das provas"
        description="Classificações oficiais com tempos de chip. Procure o seu nome ou dorsal para encontrar o seu tempo."
      >
        <div className="max-w-2xl">
          <FindMyResult index={index} />
        </div>
      </PageHeader>
      <div className="container-page py-8 sm:py-10">
        <ResultsDirectory events={events} />
      </div>
    </>
  );
}
