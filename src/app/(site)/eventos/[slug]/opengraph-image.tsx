import { getEventBySlug } from "@/server/queries/events";
import { OG_SIZE, eventOgImage } from "@/server/og-image";

export const alt = "Cartaz e informação do evento";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  return eventOgImage(await getEventBySlug((await params).slug));
}
