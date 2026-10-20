import type { Metadata } from "next";
import { listEventsWithResults } from "@/server/queries/events";
import { listCategories } from "@/server/queries/catalog";
import { searchPublishedResults } from "@/server/queries/results";
import { formatKm } from "@/lib/format";
import { PageHeader } from "@/components/ui/section-heading";
import { FindMyResult, ResultsDirectory, type ResultEventSummary } from "@/components/results/results-directory";

export const metadata: Metadata = {
  title: "Resultados",
  description: "Classificações oficiais das provas cronometradas pela AeroTiming. Procure o seu tempo por nome ou dorsal.",
};

export default async function ResultsPage({ searchParams }: { searchParams: Promise<{ procurar?: string }> }) {
  const { procurar = "" } = await searchParams;
  const [withResults, categories, matches] = await Promise.all([listEventsWithResults(), listCategories(), searchPublishedResults(procurar)]);
  const events: ResultEventSummary[] = withResults.map(({ event: e, finishers }) => ({
      slug: e.slug,
      title: e.title,
      poster: e.poster,
      date: e.date,
      category: e.category,
      categoryName: e.categoryName ?? e.category,
      venue: e.venue,
      city: e.city,
      province: e.province,
      finishers,
      distances: e.distances.map((d) => formatKm(d.distanceKm)),
    }));

  return (
    <>
      <PageHeader
        eyebrow="Resultados"
        title="Resultados das provas"
        description="Classificações oficiais com tempos de chip. Procure o seu nome ou dorsal para encontrar o seu tempo."
      >
        <div className="max-w-2xl">
          <FindMyResult matches={matches} />
        </div>
      </PageHeader>
      <div className="container-page py-8 sm:py-10">
        <ResultsDirectory events={events} categories={categories} />
      </div>
    </>
  );
}
