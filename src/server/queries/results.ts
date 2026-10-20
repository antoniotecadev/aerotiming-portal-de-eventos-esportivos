import "server-only";
import { connection } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import type { Gender, RaceResult } from "@/lib/types";
import { mapResult, msToHms, resultInclude } from "../mappers";
import { PAGE_SIZE, and, pageOf, textMatch } from "../search";

/** Resultados de uma prova (só se estiverem publicados) — usado na exportação CSV e no pódio da Home. */
export async function listResults(eventSlug: string, distanceCode?: string) {
  await connection();
  const rows = await prisma.result.findMany({
    where: { event: { slug: eventSlug, resultsPublished: true }, ...(distanceCode ? { distance: { code: distanceCode } } : {}) },
    include: resultInclude,
    orderBy: [{ distance: { sortOrder: "asc" } }, { position: { sort: "asc", nulls: "last" } }, { name: "asc" }],
  });
  return rows.map(mapResult);
}

/** Pódio (3 primeiros por sexo) de uma distância publicada. */
export async function listPodium(eventSlug: string, distanceCode: string) {
  await connection();
  const rows = await prisma.result.findMany({
    where: { event: { slug: eventSlug, resultsPublished: true }, distance: { code: distanceCode }, positionGender: { lte: 3 } },
    include: resultInclude,
    orderBy: [{ gender: "asc" }, { positionGender: "asc" }],
  });
  return rows.map(mapResult);
}

export interface ResultFilters {
  distance?: string;
  q?: string;
  gender?: string;
  ageGroup?: string;
  page?: string | number;
}

export interface ResultsView {
  distance: string;
  rows: RaceResult[];
  /** Atletas na distância que cumprem os filtros. */
  matching: number;
  page: number;
  pages: number;
  summary: { inDistance: number; registered: number; finishers: number; dnf: number; best: string | null };
  podium: { M: RaceResult[]; F: RaceResult[] };
  ageGroups: string[];
}

type RawResult = {
  id: string;
  bib: string;
  name: string;
  gender: Gender;
  age_group: string;
  club: string;
  nationality: string;
  position: number | null;
  position_gender: number | null;
  position_age_group: number | null;
  chip_time_ms: number | null;
  gun_time_ms: number | null;
  status: string;
  splits: unknown;
  total: number;
};

/**
 * Página de resultados de uma distância, filtrada e paginada NO SERVIDOR (5.10), numa só ronda de consultas.
 * Sem `distance`, escolhe a distância do 1.º atleta que corresponde à pesquisa (ou a primeira).
 */
export async function getResultsView(
  event: { id: string; slug: string; distances: { id: string; distanceKm: number }[] },
  f: ResultFilters,
): Promise<ResultsView> {
  await connection();
  const search = textMatch(f.q, Prisma.raw("r.bib"), Prisma.raw("r.name || ' ' || r.club"));
  let code = event.distances.find((d) => d.id === f.distance)?.id;
  if (!code && search) {
    const hit = await prisma.$queryRaw<{ code: string }[]>`
      SELECT d.code FROM results r JOIN event_distances d ON d.id = r.distance_id
      WHERE r.event_id = ${event.id} AND ${search} ORDER BY d.sort_order, r.position ASC NULLS LAST LIMIT 1`;
    code = hit[0]?.code;
  }
  code ??= event.distances[0].id;
  const km = event.distances.find((d) => d.id === code)!.distanceKm;

  const inDistance = { distance: { eventId: event.id, code } };
  const gender: Gender | null = f.gender === "M" || f.gender === "F" ? f.gender : null;
  const where = and([
    Prisma.sql`r.distance_id = (SELECT id FROM event_distances WHERE event_id = ${event.id} AND code = ${code})`,
    gender && Prisma.sql`r.gender::text = ${gender}`,
    f.ageGroup ? Prisma.sql`r.age_group = ${f.ageGroup}` : null,
    search,
  ]);
  const pageRows = (page: number) => prisma.$queryRaw<RawResult[]>`
    SELECT r.*, count(*) OVER()::int AS total FROM results r WHERE ${where}
    ORDER BY r.position ASC NULLS LAST, r.name ASC
    LIMIT ${PAGE_SIZE} OFFSET ${(page - 1) * PAGE_SIZE}`;

  let page = pageOf(f.page);
  const [first, statusCounts, registered, podiumRows, groups, bestRow] = await Promise.all([
    pageRows(page),
    prisma.result.groupBy({ by: ["status"], where: inDistance, _count: true }),
    prisma.registration.count({ where: { ...inDistance, status: { in: ["pagamento_pendente", "confirmada"] } } }),
    prisma.result.findMany({ where: { ...inDistance, positionGender: { lte: 3 } }, include: resultInclude, orderBy: { positionGender: "asc" } }),
    prisma.result.findMany({ where: inDistance, distinct: ["ageGroup"], select: { ageGroup: true } }),
    prisma.result.findFirst({ where: { ...inDistance, position: 1 }, select: { chipTimeMs: true, gunTimeMs: true } }),
  ]);
  let raw = first;
  let matching = raw[0]?.total ?? 0;
  if (!raw.length && page > 1) {
    // Página além do fim (ex.: link antigo): mostra a última
    const [{ n }] = await prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM results r WHERE ${where}`;
    matching = n;
    page = Math.max(1, Math.ceil(n / PAGE_SIZE));
    raw = n ? await pageRows(page) : [];
  }

  const toResult = (r: RawResult) =>
    mapResult({
      id: r.id,
      bib: r.bib,
      name: r.name,
      gender: r.gender,
      ageGroup: r.age_group,
      club: r.club,
      nationality: r.nationality,
      position: r.position,
      positionGender: r.position_gender,
      positionAgeGroup: r.position_age_group,
      chipTimeMs: r.chip_time_ms,
      gunTimeMs: r.gun_time_ms,
      status: r.status,
      splits: r.splits,
      event: { slug: event.slug },
      distance: { code, distanceKm: km },
    } as unknown as Parameters<typeof mapResult>[0]);

  const count = (s: string) => statusCounts.find((c) => c.status === s)?._count ?? 0;
  const total = statusCounts.reduce((sum, c) => sum + c._count, 0);
  const podium = podiumRows.map(mapResult);
  return {
    distance: code,
    rows: raw.map(toResult),
    matching,
    page,
    pages: Math.max(1, Math.ceil(matching / PAGE_SIZE)),
    summary: { inDistance: total, registered, finishers: count("terminou"), dnf: total - count("terminou"), best: msToHms(bestRow?.chipTimeMs ?? bestRow?.gunTimeMs ?? null) },
    podium: { M: podium.filter((r) => r.gender === "M"), F: podium.filter((r) => r.gender === "F") },
    ageGroups: groups.map((g) => g.ageGroup),
  };
}

/** Quantos terminaram em todo o evento (contador do separador "Resultados"). */
export async function countFinishers(eventId: string) {
  return prisma.result.count({ where: { eventId, status: "terminou" } });
}

/** "Procurar o meu resultado": pesquisa no servidor em todas as provas publicadas (máx. 8). */
export async function searchPublishedResults(q: string) {
  await connection();
  const term = q.trim();
  if (term.length < 2 && !/^\d+$/.test(term)) return [];
  const match = textMatch(term, Prisma.raw("r.bib"), Prisma.raw("r.name"));
  const rows = await prisma.$queryRaw<
    { name: string; bib: string; chip_time_ms: number | null; position: number | null; slug: string; title: string; code: string; dist_name: string }[]
  >`
    SELECT r.name, r.bib, r.chip_time_ms, r.position, e.slug, e.title, d.code, d.name AS dist_name
    FROM results r JOIN events e ON e.id = r.event_id JOIN event_distances d ON d.id = r.distance_id
    WHERE e.results_published AND ${match}
    ORDER BY (r.bib = ${term}) DESC, e.date DESC, r.position ASC NULLS LAST
    LIMIT 8`;
  return rows.map((r) => ({
    name: r.name,
    bib: r.bib,
    eventSlug: r.slug,
    eventTitle: r.title,
    distanceId: r.code,
    distanceName: r.dist_name,
    chipTime: msToHms(r.chip_time_ms),
    position: r.position,
  }));
}
