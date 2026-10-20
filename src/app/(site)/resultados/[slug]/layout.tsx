import { notFound } from "next/navigation";
import { getEventBySlug } from "@/server/queries/events";

/** Como em /eventos/[slug]: 404 verdadeiro (antes do streaming) se o evento não existir ou não tiver resultados publicados (12.8). */
export default async function EventResultsLayout({ children, params }: LayoutProps<"/resultados/[slug]">) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || !event.resultsPublished) notFound();
  return children;
}
