import "server-only";
import type { SportsEvent } from "@/lib/types";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
const abs = (url: string) => (url.startsWith("http") ? url : `${SITE_URL}${url}`);

/**
 * Dados estruturados schema.org/SportsEvent (12.8): permitem ao Google mostrar a data, o local e o preço
 * do evento nos resultados de pesquisa.
 */
export function eventJsonLd(e: SportsEvent) {
  const prices = e.distances.flatMap((d) => d.tiers.map((t) => t.price)).filter((p) => p > 0);
  const soldOut = e.status === "esgotado";
  return {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: e.title,
    description: e.summary,
    url: `${SITE_URL}/eventos/${e.slug}`,
    image: [abs(e.poster)],
    startDate: `${e.date}T${e.startTime || "00:00"}:00+01:00`, // hora de Luanda (WAT)
    eventStatus: e.status === "cancelado" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    sport: e.categoryName,
    location: {
      "@type": "Place",
      name: e.venue,
      address: { "@type": "PostalAddress", streetAddress: e.address || undefined, addressLocality: e.city, addressRegion: e.province, addressCountry: "AO" },
    },
    organizer: e.organizer?.name ? { "@type": "Organization", name: e.organizer.name } : undefined,
    offers: prices.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "AOA",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          url: `${SITE_URL}/eventos/${e.slug}`,
          availability: soldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
          validFrom: e.registrationOpens,
        }
      : undefined,
  };
}

/** `<script type="application/ld+json">` seguro (escapa "<", como recomenda o guia JSON-LD do Next). */
export const jsonLdHtml = (data: unknown) => ({ __html: JSON.stringify(data).replace(/</g, "\\u003c") });
