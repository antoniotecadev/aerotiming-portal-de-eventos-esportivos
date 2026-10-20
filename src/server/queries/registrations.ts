import "server-only";
import { connection } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { Participant } from "@/lib/types";
import { mapParticipant, publicParticipantSelect } from "../mappers";
import { PAGE_SIZE, and, pageOf, textMatch } from "../search";

export interface ParticipantFilters {
  q?: string;
  distance?: string;
  gender?: string;
  pay?: string;
  page?: string | number;
}

export interface ParticipantsView {
  rows: Participant[];
  /** Inscrições activas no evento (sem filtros). */
  total: number;
  /** Inscrições que cumprem os filtros. */
  matching: number;
  page: number;
  pages: number;
}

/**
 * Lista PÚBLICA de inscritos de um evento, filtrada e paginada no servidor (5.10): só inscrições
 * activas e só campos públicos (dorsal, nome, sexo, escalão, distância, clube, província, pagamento).
 */
export async function getParticipantsView(eventId: string, f: ParticipantFilters): Promise<ParticipantsView> {
  await connection();
  const status = f.pay === "confirmado" ? ["confirmada"] : f.pay === "pendente" ? ["pagamento_pendente"] : ["pagamento_pendente", "confirmada"];
  const where = and([
    Prisma.sql`r.event_id = ${eventId}`,
    Prisma.sql`r.status::text IN (${Prisma.join(status)})`,
    f.distance ? Prisma.sql`d.code = ${f.distance}` : null,
    f.gender === "M" || f.gender === "F" ? Prisma.sql`r.gender::text = ${f.gender}` : null,
    textMatch(f.q, Prisma.raw("coalesce(r.bib, '')"), Prisma.raw("r.athlete_name || ' ' || r.club")),
  ]);
  type Raw = Parameters<typeof mapParticipant>[0] & { athlete_name: string; age_group: string; created_at: Date; slug: string; code: string; total: number };
  const pageRows = (page: number) => prisma.$queryRaw<Raw[]>`
    SELECT r.id, r.bib, r.athlete_name, r.gender::text AS gender, r.age_group, r.club, r.province, r.nationality, r.status::text AS status,
      r.created_at, e.slug, d.code, count(*) OVER()::int AS total
    FROM registrations r JOIN event_distances d ON d.id = r.distance_id JOIN events e ON e.id = r.event_id
    WHERE ${where}
    ORDER BY public.search_norm(r.athlete_name), r.id
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;

  let page = pageOf(f.page);
  const [first, total] = await Promise.all([pageRows(page), countParticipants(eventId)]);
  let raw = first;
  let matching = raw[0]?.total ?? 0;
  if (!raw.length && page > 1) {
    // Página além do fim (ex.: link antigo): mostra a última
    const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM registrations r JOIN event_distances d ON d.id = r.distance_id WHERE ${where}`;
    matching = n;
    page = Math.max(1, Math.ceil(n / PAGE_SIZE));
    raw = n ? await pageRows(page) : [];
  }
  const rows = raw.map((r) =>
    mapParticipant({ ...r, athleteName: r.athlete_name, ageGroup: r.age_group, createdAt: r.created_at, event: { slug: r.slug }, distance: { code: r.code } }),
  );
  return { rows, total, matching, page, pages: Math.max(1, Math.ceil(matching / PAGE_SIZE)) };
}

/** Números da página do evento: inscritos, pagos, províncias e os 6 inscritos mais recentes. */
export async function getParticipantStats(eventId: string) {
  await connection();
  const active = { eventId, status: { in: ["pagamento_pendente" as const, "confirmada" as const] } };
  const [total, confirmed, provinces, latest] = await Promise.all([
    prisma.registration.count({ where: active }),
    prisma.registration.count({ where: { eventId, status: "confirmada" } }),
    prisma.registration.findMany({ where: active, distinct: ["province"], select: { province: true } }),
    prisma.registration.findMany({ where: active, select: publicParticipantSelect, orderBy: { createdAt: "desc" }, take: 6 }),
  ]);
  return { total, confirmed, provinces: provinces.length, latest: latest.map(mapParticipant) };
}

/** Inscrições activas num evento (contador do separador "Inscritos"). */
export function countParticipants(eventId: string) {
  return prisma.registration.count({ where: { eventId, status: { in: ["pagamento_pendente", "confirmada"] } } });
}
