import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { today } from "@/lib/today";
import type { User } from "@/lib/types";
import type { AdminData, AdminEvent } from "@/components/admin/admin-types";
import { getSiteSettings } from "./site";
import { eventDetailInclude, mapBanner, mapCategory, mapEvent, mapSponsor } from "../mappers";

/**
 * Dados do painel de gestão lidos da BD (Fase 9), já filtrados por permissão:
 * admin vê tudo; organizador só os eventos onde está em event_staff. As listas grandes estão em admin-lists.ts.
 */
export async function getAdminData(user: User): Promise<AdminData> {
  await connection();
  const isAdmin = user.role === "admin";
  const t = today();
  const eventWhere = isAdmin ? {} : { staff: { some: { profileId: user.id, role: "organizador" as const } } };

  const [eventRows, banners, sponsors, categories, settings] = await Promise.all([
    prisma.event.findMany({ where: eventWhere, include: eventDetailInclude, orderBy: { date: "desc" } }),
    prisma.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.sponsor.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    getSiteSettings(),
  ]);

  const events: AdminEvent[] = eventRows.map((row) => ({
    ...mapEvent(row, t, { editorial: true }),
    draft: row.status === "rascunho",
    regulationPdf: row.regulationPdfUrl ? { name: "Regulamento.pdf", url: row.regulationPdfUrl } : null,
    routeFiles: Object.fromEntries(row.distances.filter((d) => d.route?.gpxUrl).map((d) => [d.code, { gpx: d.route!.gpxUrl! }])),
  }));

  // Inscrições, resultados e utilizadores já não vêm aqui: cada página carrega só a página pedida (12.10)
  return {
    events,
    banners: banners.map(mapBanner),
    sponsors: sponsors.map(mapSponsor),
    categories: categories.map(mapCategory),
    settings,
    publishedResults: eventRows.filter((e) => e.resultsPublished).map((e) => e.slug),
  };
}
