import "server-only";
import { connection } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { monthShort } from "@/lib/format";
import { today } from "@/lib/today";
import type { Gender, PaymentStatus, RaceResult, User } from "@/lib/types";
import type { AdminParticipant } from "@/components/admin/admin-types";
import { mapProfile, mapResult, profileInclude, resultInclude } from "../mappers";
import { canManageEvent } from "../permissions";
import { and, pageOf, textMatch } from "../search";

/**
 * Listas do painel paginadas e filtradas NO SERVIDOR (12.10). Antes, o layout do painel carregava todas
 * as inscrições, resultados e utilizadores em cada página. Tudo limitado aos eventos que a pessoa gere.
 */

export const ADMIN_PAGE_SIZE = 25;

/** Ids dos eventos que a pessoa gere (null = todos, admin). */
export async function managedEventIds(user: User): Promise<string[] | null> {
  if (user.role === "admin") return null;
  const rows = await prisma.eventStaff.findMany({ where: { profileId: user.id, role: "organizador" }, select: { eventId: true } });
  return rows.map((r) => r.eventId);
}

const eventScope = (ids: string[] | null) => (ids === null ? null : ids.length ? Prisma.sql`r.event_id IN (${Prisma.join(ids)})` : Prisma.sql`FALSE`);

const PAYMENT_SQL: Record<string, Prisma.Sql> = {
  confirmado: Prisma.sql`r.status = 'confirmada'`,
  pendente: Prisma.sql`r.status = 'pagamento_pendente'`,
  cancelado: Prisma.sql`r.status IN ('cancelada', 'expirada')`,
};
const paymentOf = (status: string): PaymentStatus => (status === "confirmada" ? "confirmado" : status === "pagamento_pendente" ? "pendente" : "cancelado");

// ───────────── Inscrições ─────────────

export interface RegistrationFilters {
  q?: string;
  evento?: string;
  distancia?: string;
  pagamento?: string;
  kit?: string;
  pagina?: string;
}

export type AdminRegistrationRow = AdminParticipant & { price: number; eventTitle: string; distanceName: string };

type RawReg = {
  id: string; code: string; bib: string | null; athlete_name: string; gender: Gender; age_group: string; club: string; province: string; nationality: string;
  status: string; kit_status: string; price: number; created_at: Date; slug: string; event_title: string; code_d: string; distance_name: string; total: number;
};

function registrationWhere(ids: string[] | null, f: RegistrationFilters) {
  return and([
    eventScope(ids),
    f.evento ? Prisma.sql`e.slug = ${f.evento}` : null,
    f.evento && f.distancia ? Prisma.sql`d.code = ${f.distancia}` : null,
    f.pagamento ? (PAYMENT_SQL[f.pagamento] ?? null) : null,
    f.kit === "levantado" ? Prisma.sql`r.kit_status = 'levantado'` : f.kit === "por-levantar" ? Prisma.sql`r.kit_status <> 'levantado'` : null,
    textMatch(f.q, Prisma.raw("coalesce(r.bib, '')"), Prisma.raw("r.athlete_name || ' ' || r.club || ' ' || r.code")),
  ]);
}

const FROM_REG = Prisma.sql`FROM registrations r JOIN events e ON e.id = r.event_id JOIN event_distances d ON d.id = r.distance_id`;

const toRegRow = (r: RawReg): AdminRegistrationRow => ({
  id: r.id,
  eventSlug: r.slug,
  distanceId: r.code_d,
  bib: r.bib ?? "—",
  name: r.athlete_name,
  gender: r.gender,
  ageGroup: r.age_group,
  club: r.club,
  province: r.province,
  nationality: r.nationality,
  paymentStatus: paymentOf(r.status),
  registeredAt: r.created_at.toISOString(),
  kitPickedUp: r.kit_status === "levantado",
  price: r.price,
  eventTitle: r.event_title,
  distanceName: r.distance_name,
});

const regColumns = Prisma.sql`r.id, r.code, r.bib, r.athlete_name, r.gender::text AS gender, r.age_group, r.club, r.province, r.nationality,
  r.status::text AS status, r.kit_status::text AS kit_status, r.price, r.created_at, e.slug, e.title AS event_title, d.code AS code_d, d.name AS distance_name`;

export async function getAdminRegistrations(user: User, f: RegistrationFilters) {
  await connection();
  const ids = await managedEventIds(user);
  const where = registrationWhere(ids, f);
  const [[c], events] = await Promise.all([
    prisma.$queryRaw<{ total: number; confirmado: number; pendente: number; cancelado: number; kit: number; revenue: number }[]>`
      SELECT count(*)::int AS total,
        count(*) FILTER (WHERE r.status = 'confirmada')::int AS confirmado,
        count(*) FILTER (WHERE r.status = 'pagamento_pendente')::int AS pendente,
        count(*) FILTER (WHERE r.status IN ('cancelada', 'expirada'))::int AS cancelado,
        count(*) FILTER (WHERE r.kit_status = 'levantado')::int AS kit,
        coalesce(sum(r.price) FILTER (WHERE r.status = 'confirmada'), 0)::int AS revenue
      ${FROM_REG} WHERE ${where}`,
    prisma.event.findMany({
      where: { ...(ids === null ? {} : { id: { in: ids } }), registrations: { some: {} } },
      select: { slug: true, title: true, date: true, distances: { select: { code: true, name: true }, orderBy: { sortOrder: "asc" } } },
      orderBy: { date: "desc" },
    }),
  ]);
  const pages = Math.max(1, Math.ceil(c.total / ADMIN_PAGE_SIZE));
  const page = Math.min(pageOf(f.pagina), pages);
  const raw = await prisma.$queryRaw<RawReg[]>`
    SELECT ${regColumns} ${FROM_REG} WHERE ${where}
    ORDER BY r.created_at DESC, r.id LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${(page - 1) * ADMIN_PAGE_SIZE}`;
  return {
    rows: raw.map(toRegRow),
    counts: c,
    page,
    pages,
    events: events.map((e) => ({ slug: e.slug, title: e.title, distances: e.distances.map((d) => ({ id: d.code, name: d.name })) })),
  };
}

/** Todas as inscrições filtradas, para o CSV (máx. 50 000). */
export async function exportAdminRegistrations(user: User, f: RegistrationFilters) {
  const ids = await managedEventIds(user);
  const raw = await prisma.$queryRaw<RawReg[]>`
    SELECT ${regColumns} ${FROM_REG} WHERE ${registrationWhere(ids, f)} ORDER BY e.date DESC, r.created_at DESC LIMIT 50000`;
  return raw.map(toRegRow);
}

// ───────────── Painel (estatísticas) ─────────────

export async function getDashboardStats(user: User) {
  await connection();
  const ids = await managedEventIds(user);
  const scope = eventScope(ids) ?? Prisma.sql`TRUE`;
  const [ty, tm] = today().split("-").map(Number);
  const since = new Date(Date.UTC(ty, tm - 1 - 7, 1));
  const [[totals], byEvent, byMonth, latest] = await Promise.all([
    prisma.$queryRaw<{ total: number; revenue: number; pending: number; pending_value: number }[]>`
      SELECT count(*) FILTER (WHERE r.status IN ('confirmada', 'pagamento_pendente'))::int AS total,
        coalesce(sum(r.price) FILTER (WHERE r.status = 'confirmada'), 0)::int AS revenue,
        count(*) FILTER (WHERE r.status = 'pagamento_pendente')::int AS pending,
        coalesce(sum(r.price) FILTER (WHERE r.status = 'pagamento_pendente'), 0)::int AS pending_value
      FROM registrations r WHERE ${scope}`,
    prisma.$queryRaw<{ id: string; label: string; value: number }[]>`
      SELECT e.id, e.title AS label, count(*)::int AS value FROM registrations r JOIN events e ON e.id = r.event_id
      WHERE ${scope} AND r.status IN ('confirmada', 'pagamento_pendente') GROUP BY e.id, e.title ORDER BY value DESC LIMIT 8`,
    prisma.$queryRaw<{ key: string; value: number }[]>`
      SELECT to_char(r.created_at AT TIME ZONE 'Africa/Luanda', 'YYYY-MM') AS key, coalesce(sum(r.price), 0)::int AS value
      FROM registrations r WHERE ${scope} AND r.status = 'confirmada' AND r.created_at >= ${since} GROUP BY 1`,
    prisma.$queryRaw<RawReg[]>`SELECT ${regColumns} ${FROM_REG} WHERE ${scope} ORDER BY r.created_at DESC LIMIT 8`,
  ]);
  const months = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(ty, tm - 1 - (7 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    return { key, label: monthShort(d.getMonth()), year: d.getFullYear(), value: byMonth.find((m) => m.key === key)?.value ?? 0 };
  });
  return { total: totals.total, revenue: totals.revenue, pending: totals.pending, pendingValue: totals.pending_value, byEvent, months, latest: latest.map(toRegRow) };
}

// ───────────── Utilizadores (só admin — a página verifica) ─────────────

export interface UserFilters {
  q?: string;
  perfil?: string;
  estado?: string;
  pagina?: string;
}

export async function getAdminUsers(f: UserFilters) {
  await connection();
  const where = and([
    f.perfil === "atleta" || f.perfil === "organizador" || f.perfil === "admin" ? Prisma.sql`p.role::text = ${f.perfil}` : null,
    f.estado === "activo" ? Prisma.sql`p.active` : f.estado === "inactivo" ? Prisma.sql`NOT p.active` : null,
    textMatch(f.q, Prisma.raw("coalesce(p.phone, '')"), Prisma.raw("p.name || ' ' || p.email")),
  ]);
  const [[c], [all]] = await Promise.all([
    prisma.$queryRaw<{ n: number }[]>`SELECT count(*)::int AS n FROM profiles p WHERE ${where}`,
    prisma.$queryRaw<{ total: number; staff: number }[]>`SELECT count(*)::int AS total, count(*) FILTER (WHERE role <> 'atleta')::int AS staff FROM profiles`,
  ]);
  const pages = Math.max(1, Math.ceil(c.n / ADMIN_PAGE_SIZE));
  const page = Math.min(pageOf(f.pagina), pages);
  const ids = await prisma.$queryRaw<{ id: string }[]>`
    SELECT p.id FROM profiles p WHERE ${where} ORDER BY p.created_at DESC, p.id LIMIT ${ADMIN_PAGE_SIZE} OFFSET ${(page - 1) * ADMIN_PAGE_SIZE}`;
  const [profiles, counts] = await Promise.all([
    prisma.profile.findMany({ where: { id: { in: ids.map((x) => x.id) } }, include: profileInclude }),
    prisma.registration.groupBy({ by: ["userId"], where: { userId: { in: ids.map((x) => x.id) } }, _count: true }),
  ]);
  const order = new Map(ids.map((x, i) => [x.id, i]));
  const rows = profiles
    .map((p) => ({ ...mapProfile(p), registrations: counts.find((x) => x.userId === p.id)?._count ?? 0 }))
    .sort((a, b) => order.get(a.id)! - order.get(b.id)!);
  return { rows, matching: c.n, total: all.total, staff: all.staff, page, pages };
}

// ───────────── Resultados de uma distância ─────────────

/** Resultados de UMA distância (e os inscritos pagos dela, para "A partir das inscrições"). null se não puder gerir. */
export async function getDistanceResults(user: User, eventSlug: string, distanceCode: string) {
  await connection();
  const dist = await prisma.eventDistance.findFirst({ where: { code: distanceCode, event: { slug: eventSlug } }, select: { id: true, eventId: true } });
  if (!dist || !(await canManageEvent(user, dist.eventId))) return null;
  const [results, confirmed, eventResultCount] = await Promise.all([
    prisma.result.findMany({ where: { distanceId: dist.id }, include: resultInclude, orderBy: [{ position: { sort: "asc", nulls: "last" } }, { bib: "asc" }] }),
    prisma.registration.findMany({
      where: { distanceId: dist.id, status: "confirmada", bib: { not: null } },
      select: { bib: true, athleteName: true, gender: true, ageGroup: true, club: true, nationality: true },
      orderBy: { bib: "asc" },
    }),
    prisma.result.count({ where: { eventId: dist.eventId } }),
  ]);
  return {
    results: results.map(mapResult) as RaceResult[],
    confirmed: confirmed.map((r) => ({ bib: r.bib!, name: r.athleteName, gender: r.gender, ageGroup: r.ageGroup, club: r.club, nationality: r.nationality })),
    eventResultCount,
  };
}

/** Evento e distância por omissão na página de Resultados: o último com resultados, senão o último terminado, senão o mais recente. */
export async function defaultResultsTarget(user: User) {
  const ids = await managedEventIds(user);
  const scope = ids === null ? {} : { id: { in: ids } };
  const ev =
    (await prisma.event.findFirst({ where: { ...scope, results: { some: {} } }, orderBy: { date: "desc" }, select: { slug: true, distances: { select: { code: true }, orderBy: { sortOrder: "asc" }, take: 1 } } })) ??
    (await prisma.event.findFirst({ where: { ...scope, status: "terminado" }, orderBy: { date: "desc" }, select: { slug: true, distances: { select: { code: true }, orderBy: { sortOrder: "asc" }, take: 1 } } })) ??
    (await prisma.event.findFirst({ where: scope, orderBy: { date: "desc" }, select: { slug: true, distances: { select: { code: true }, orderBy: { sortOrder: "asc" }, take: 1 } } }));
  return ev ? { evento: ev.slug, distancia: ev.distances[0]?.code ?? "" } : null;
}

// ───────────── Pesquisa global do painel ─────────────

export async function searchAdmin(user: User, q: string) {
  const term = q.trim();
  if (term.length < 2) return { participants: [], users: [] };
  const ids = await managedEventIds(user);
  const participants = await prisma.$queryRaw<RawReg[]>`
    SELECT ${regColumns} ${FROM_REG}
    WHERE ${and([eventScope(ids), textMatch(term, Prisma.raw("coalesce(r.bib, '')"), Prisma.raw("r.athlete_name || ' ' || r.code"))])}
    ORDER BY r.created_at DESC LIMIT 5`;
  const users =
    user.role === "admin"
      ? await prisma.$queryRaw<{ id: string; name: string; email: string }[]>`
          SELECT p.id, p.name, p.email FROM profiles p WHERE ${textMatch(term, Prisma.raw("coalesce(p.phone, '')"), Prisma.raw("p.name || ' ' || p.email"))}
          ORDER BY p.created_at DESC LIMIT 4`
      : [];
  return { participants: participants.map(toRegRow), users };
}
