import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { today } from "@/lib/today";
import { eventDetailInclude, eventListInclude, mapEvent } from "../mappers";
import type { Prisma } from "@/generated/prisma/client";

/** Eventos visíveis ao público (os rascunhos só aparecem no admin). */
const PUBLIC: Prisma.EventWhereInput = { status: { not: "rascunho" } };
const asDate = (iso: string) => new Date(`${iso}T00:00:00Z`);

/** Todos os eventos públicos (lista de eventos e calendário). */
export async function listPublicEvents() {
  await connection();
  const t = today();
  const rows = await prisma.event.findMany({ where: PUBLIC, include: eventListInclude, orderBy: { date: "asc" } });
  return rows.map((r) => mapEvent(r, t));
}

/** Próximos eventos (de hoje em diante), por data. */
export async function listUpcomingEvents() {
  await connection();
  const t = today();
  const rows = await prisma.event.findMany({
    where: { date: { gte: asDate(t) }, status: { notIn: ["rascunho", "cancelado"] } },
    include: eventListInclude,
    orderBy: { date: "asc" },
  });
  return rows.map((r) => mapEvent(r, t));
}

/** Próximos eventos adicionados mais recentemente ao portal. */
export async function listRecentEvents(limit = 4) {
  await connection();
  const t = today();
  const rows = await prisma.event.findMany({
    where: { date: { gte: asDate(t) }, status: { notIn: ["rascunho", "cancelado"] } },
    include: eventListInclude,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map((r) => mapEvent(r, t));
}

/** Evento completo para a página de detalhe (deduplicado no mesmo pedido). */
export const getEventBySlug = cache(async (slug: string) => {
  await connection();
  const row = await prisma.event.findFirst({ where: { slug, ...PUBLIC }, include: eventDetailInclude });
  return row ? mapEvent(row, today()) : null;
});

/** Provas terminadas com resultados publicados, com o nº de atletas que terminaram. */
export async function listEventsWithResults() {
  await connection();
  const t = today();
  const rows = await prisma.event.findMany({
    where: { status: "terminado", resultsPublished: true, results: { some: {} } },
    include: { ...eventListInclude, _count: { select: { results: { where: { status: "terminou" } } } } },
    orderBy: { date: "desc" },
  });
  return rows.map((r) => ({ event: mapEvent(r, t), finishers: r._count.results }));
}

/** Para o sitemap (12.8): eventos públicos com a data da última alteração e se têm resultados publicados. */
export async function listSitemapEvents() {
  await connection();
  return prisma.event.findMany({
    where: { status: { notIn: ["rascunho", "cancelado"] } },
    select: { slug: true, updatedAt: true, date: true, resultsPublished: true },
    orderBy: { date: "desc" },
  });
}
