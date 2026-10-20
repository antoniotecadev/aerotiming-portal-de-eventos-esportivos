import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { today } from "@/lib/today";
import type { User } from "@/lib/types";
import type { AdminData, AdminEvent, AdminParticipant, SiteSettings } from "@/components/admin/admin-types";
import { DEFAULT_SETTINGS } from "@/components/admin/admin-types";
import { eventDetailInclude, mapBanner, mapCategory, mapEvent, mapParticipant, mapProfile, mapResult, mapSponsor, profileInclude, publicParticipantSelect, resultInclude } from "../mappers";

/**
 * Dados do painel de gestão lidos da BD (Fase 9), já filtrados por permissão:
 * admin vê tudo; organizador só os eventos onde está em event_staff (e os respectivos inscritos/resultados).
 */
export async function getAdminData(user: User): Promise<AdminData> {
  await connection();
  const isAdmin = user.role === "admin";
  const t = today();
  const eventWhere = isAdmin ? {} : { staff: { some: { profileId: user.id, role: "organizador" as const } } };

  const eventRows = await prisma.event.findMany({ where: eventWhere, include: eventDetailInclude, orderBy: { date: "desc" } });
  const eventIds = eventRows.map((e) => e.id);

  const [regRows, resultRows, users, regCounts, banners, sponsors, categories, siteSetting] = await Promise.all([
    prisma.registration.findMany({
      where: { eventId: { in: eventIds } },
      select: { ...publicParticipantSelect, kitStatus: true, userId: true, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.result.findMany({ where: { eventId: { in: eventIds } }, include: resultInclude, orderBy: [{ distance: { sortOrder: "asc" } }, { position: { sort: "asc", nulls: "last" } }] }),
    isAdmin ? prisma.profile.findMany({ include: profileInclude, orderBy: { createdAt: "desc" } }) : Promise.resolve([]),
    isAdmin ? prisma.registration.groupBy({ by: ["userId"], _count: true }) : Promise.resolve([]),
    prisma.banner.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.sponsor.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.category.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.siteSetting.findUnique({ where: { key: "site" } }),
  ]);

  const events: AdminEvent[] = eventRows.map((row) => ({
    ...mapEvent(row, t, { editorial: true }),
    draft: row.status === "rascunho",
    regulationPdf: row.regulationPdfUrl ? { name: "Regulamento.pdf", url: row.regulationPdfUrl } : null,
    routeFiles: Object.fromEntries(row.distances.filter((d) => d.route?.gpxUrl).map((d) => [d.code, { gpx: d.route!.gpxUrl! }])),
  }));

  const participants: AdminParticipant[] = regRows.map((r) => ({
    ...mapParticipant(r),
    // O painel mostra o estado do PAGAMENTO (não só o da inscrição)
    paymentStatus: r.payments[0]?.status === "confirmado" ? "confirmado" : r.status === "cancelada" || r.status === "expirada" ? "cancelado" : "pendente",
    kitPickedUp: r.kitStatus === "levantado",
  }));

  const countByUser = new Map(regCounts.map((c) => [c.userId, c._count]));

  return {
    events,
    participants,
    results: resultRows.map(mapResult),
    users: users.map(mapProfile),
    // Só o nº de inscrições por utilizador é usado no painel (users-manager)
    registrations: [...countByUser.entries()].flatMap(([userId, n]) =>
      Array.from({ length: n }, (_, i) => ({ id: `${userId}-${i}`, userId: userId ?? "" }) as AdminData["registrations"][number]),
    ),
    banners: banners.map(mapBanner),
    sponsors: sponsors.map(mapSponsor),
    categories: categories.map(mapCategory),
    settings: { ...DEFAULT_SETTINGS, ...((siteSetting?.value as Partial<SiteSettings> | undefined) ?? {}) },
    publishedResults: eventRows.filter((e) => e.resultsPublished).map((e) => e.slug),
  };
}
