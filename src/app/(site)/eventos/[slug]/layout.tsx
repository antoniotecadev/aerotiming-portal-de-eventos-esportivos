import { notFound } from "next/navigation";
import { getEventBySlug } from "@/server/queries/events";

/**
 * Verifica se o evento existe ANTES de começar o streaming (o loading.tsx desta pasta fica por dentro),
 * para que um endereço errado responda HTTP 404 e não 200 (12.8). getEventBySlug está em cache por pedido.
 */
export default async function EventLayout({ children, params }: LayoutProps<"/eventos/[slug]">) {
  const { slug } = await params;
  if (!(await getEventBySlug(slug))) notFound();
  return children;
}
