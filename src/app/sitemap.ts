import type { MetadataRoute } from "next";
import { listSitemapEvents } from "@/server/queries/events";
import { today } from "@/lib/today";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/** Mapa do site para os motores de busca (12.8): páginas públicas, eventos e resultados publicados. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = await listSitemapEvents();
  const t = today();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/eventos`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/calendario`, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE}/resultados`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/sobre`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/ajuda`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/contacto`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${SITE}/termos`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${SITE}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
  ];
  return [
    ...pages,
    ...events.flatMap((e) => {
      const upcoming = e.date.toISOString().slice(0, 10) >= t;
      return [
        { url: `${SITE}/eventos/${e.slug}`, lastModified: e.updatedAt, changeFrequency: upcoming ? ("daily" as const) : ("yearly" as const), priority: upcoming ? 0.8 : 0.4 },
        ...(e.resultsPublished ? [{ url: `${SITE}/resultados/${e.slug}`, lastModified: e.updatedAt, changeFrequency: "monthly" as const, priority: 0.6 }] : []),
      ];
    }),
  ];
}
