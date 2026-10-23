"use server";

import { randomBytes } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Banner, Category, EventStatus, RaceResult, Sponsor, User } from "@/lib/types";
import type { AdminEvent, AdminParticipant, SiteSettings } from "@/components/admin/admin-types";
import { getCurrentUser, hasRole } from "../auth";
import { canManageEvent } from "../permissions";
import { releaseSlot } from "../registrations";
import { checkBanner, checkCategory, checkEvent, checkSponsor, checkUser, cleanSettings } from "../admin-validate";
import { eraseRegistrationsOf } from "../privacy";
import { recomputeRankings } from "../results";
import { confirmPayment } from "./payments";

/**
 * Uma só porta de entrada para as escritas do painel (Fase 9). Cada operação verifica permissões
 * no servidor e escreve no audit_logs. O cliente (admin-store.tsx) aplica a alteração no ecrã e
 * chama esta action; em caso de erro, volta a ler os dados do servidor.
 */
export type AdminOp =
  | { type: "event.save"; event: AdminEvent; isNew: boolean }
  | { type: "event.remove"; id: string }
  | { type: "participant.update"; id: string; patch: Partial<AdminParticipant> }
  | { type: "payment.confirm"; participantIds: string[] }
  | { type: "results.sync"; upsert: RaceResult[]; removeIds: string[] }
  | { type: "results.publish"; eventSlug: string; published: boolean }
  | { type: "user.save"; user: User; isNew: boolean }
  | { type: "user.remove"; id: string }
  | { type: "banner.save"; banner: Banner }
  | { type: "banner.remove"; id: string }
  | { type: "banner.order"; ids: string[] }
  | { type: "sponsor.save"; sponsor: Sponsor }
  | { type: "sponsor.remove"; id: string }
  | { type: "category.update"; slug: string; patch: Partial<Category> }
  | { type: "category.create"; category: Category }
  | { type: "category.remove"; slug: string }
  | { type: "settings.save"; settings: SiteSettings };

export type AdminOpResult = { ok: true; message?: string } | { ok: false; error: string };

class Fail extends Error {}
const fail = (msg: string): never => {
  throw new Fail(msg);
};

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);
const uiToDb = (s: EventStatus) =>
  (s === "ultimas-vagas" || s === "esgotado" ? "inscricoes_abertas" : s.replace(/-/g, "_")) as Prisma.EventCreateInput["status"];
const hmsToMs = (t: string | null) => {
  if (!t) return null;
  const parts = t.split(":").map(Number);
  if (parts.some(Number.isNaN)) return null;
  const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1]];
  return ((h * 60 + m) * 60 + s) * 1000;
};

export async function adminMutate(op: AdminOp): Promise<AdminOpResult> {
  const user = await getCurrentUser();
  if (!hasRole(user, "admin", "organizador")) return { ok: false, error: "Sem permissão." };
  const me = user!;
  const isAdmin = me.role === "admin";
  const adminOnly = () => !isAdmin && fail("Só o administrador pode fazer esta alteração.");
  const audit = (action: string, entity: string, entityId: string, data?: Prisma.InputJsonValue) =>
    prisma.auditLog.create({ data: { actorId: me.id, action, entity, entityId, data } });

  try {
    switch (op.type) {
      // ───────────── Eventos ─────────────
      case "event.save": {
        const message = await saveEvent(me, op.event, op.isNew);
        await audit(op.isNew ? "event.create" : "event.update", "event", op.event.id, { slug: op.event.slug });
        return { ok: true, message };
      }
      case "event.remove": {
        if (!(await canManageEvent(me, op.id))) fail("Sem permissão para este evento.");
        const regs = await prisma.registration.count({ where: { eventId: op.id } });
        if (regs > 0) {
          await prisma.event.update({ where: { id: op.id }, data: { status: "cancelado" } });
          await audit("event.cancel", "event", op.id);
          return { ok: true, message: "O evento tem inscrições, por isso foi marcado como cancelado em vez de apagado." };
        }
        await prisma.event.delete({ where: { id: op.id } });
        await audit("event.delete", "event", op.id);
        return { ok: true };
      }

      // ───────────── Inscrições ─────────────
      case "participant.update": {
        const reg = await prisma.registration.findUnique({ where: { id: op.id }, select: { id: true, eventId: true, distanceId: true, status: true } });
        if (!reg || !(await canManageEvent(me, reg.eventId))) fail("Inscrição não encontrada ou sem permissão.");
        const p = op.patch;
        const data: Prisma.RegistrationUpdateInput = {};
        if (p.bib !== undefined) {
          const bib = String(p.bib).trim();
          const taken = await prisma.registration.findFirst({ where: { eventId: reg!.eventId, bib, id: { not: reg!.id } }, select: { code: true } });
          if (taken) fail(`O dorsal ${bib} já está atribuído (${taken.code}).`);
          data.bib = bib || null;
        }
        if (p.kitPickedUp !== undefined) Object.assign(data, p.kitPickedUp ? { kitStatus: "levantado", kitPickedUpAt: new Date(), kitPickedUpById: me.id } : { kitStatus: "por_levantar", kitPickedUpAt: null, kitPickedUpById: null });
        await prisma.$transaction(async (tx) => {
          if (p.paymentStatus === "cancelado" && (reg!.status === "pagamento_pendente" || reg!.status === "confirmada")) {
            Object.assign(data, { status: "cancelada", cancelledAt: new Date() });
            await tx.payment.updateMany({ where: { registrationId: reg!.id, status: { in: ["pendente", "em_analise", "rejeitado"] } }, data: { status: "cancelado" } });
            await releaseSlot(tx, reg!.distanceId);
          }
          if (p.paymentStatus === "pendente" && (reg!.status === "cancelada" || reg!.status === "expirada")) {
            const ok = await tx.$executeRaw`UPDATE event_distances SET slots_taken = slots_taken + 1 WHERE id = ${reg!.distanceId} AND slots_taken < total_slots`;
            if (!ok) fail("Já não há vagas nesta distância para reactivar a inscrição.");
            Object.assign(data, { status: "pagamento_pendente", cancelledAt: null });
            await tx.payment.updateMany({ where: { registrationId: reg!.id, status: { in: ["cancelado", "expirado"] } }, data: { status: "pendente", expiresAt: new Date(Date.now() + 72 * 3_600_000) } });
          }
          await tx.registration.update({ where: { id: reg!.id }, data });
        });
        await audit("registration.update", "registration", reg!.id, JSON.parse(JSON.stringify(p)));
        return { ok: true };
      }
      case "payment.confirm": {
        let done = 0;
        for (const id of op.participantIds) {
          const pay = await prisma.payment.findFirst({ where: { registrationId: id }, orderBy: { createdAt: "desc" }, select: { id: true } });
          if (pay && (await confirmPayment({ paymentId: pay.id, force: true })).ok) done++;
        }
        return { ok: true, message: `${done} pagamento(s) confirmado(s) com dorsal atribuído.` };
      }

      // ───────────── Resultados ─────────────
      case "results.sync": {
        const slugs = [...new Set(op.upsert.map((r) => r.eventSlug))];
        const events = await prisma.event.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true, distances: { select: { id: true, code: true } } } });
        for (const e of events) if (!(await canManageEvent(me, e.id))) fail("Sem permissão para os resultados deste evento.");
        // Os ids de resultados já existentes podem pertencer a outro evento: exigir permissão sobre o evento ACTUAL (12.4, M1)
        const existingRows = op.upsert.length ? await prisma.result.findMany({ where: { id: { in: op.upsert.map((r) => r.id) } }, select: { id: true, eventId: true } }) : [];
        for (const row of existingRows) {
          const target = events.find((e) => e.slug === op.upsert.find((r) => r.id === row.id)?.eventSlug);
          if (!target || row.eventId !== target.id) fail("Este resultado pertence a outro evento.");
        }
        const removed = op.removeIds.length ? await prisma.result.findMany({ where: { id: { in: op.removeIds } }, select: { eventId: true, distanceId: true } }) : [];
        for (const eventId of new Set(removed.map((o) => o.eventId))) if (!(await canManageEvent(me, eventId))) fail("Sem permissão para os resultados deste evento.");
        // Inscrições por dorsal lidas de uma vez (para ligar cada resultado ao perfil do atleta)
        const regs = await prisma.registration.findMany({
          where: { OR: events.map((e) => ({ eventId: e.id, bib: { in: op.upsert.filter((r) => r.eventSlug === e.slug).map((r) => r.bib) } })) },
          select: { id: true, eventId: true, bib: true, result: { select: { id: true } } },
        });
        const touched = new Set(removed.map((o) => o.distanceId));
        await prisma.$transaction(async (tx) => {
          if (op.removeIds.length) await tx.result.deleteMany({ where: { id: { in: op.removeIds } } });
          for (const r of op.upsert) {
            const ev = events.find((e) => e.slug === r.eventSlug) ?? fail("Evento desconhecido.");
            const dist = ev.distances.find((d) => d.code === r.distanceId) ?? fail("Distância desconhecida.");
            touched.add(dist.id);
            const reg = regs.find((x) => x.eventId === ev.id && x.bib === r.bib);
            const data = {
              eventId: ev.id,
              distanceId: dist.id,
              registrationId: reg && (!reg.result || reg.result.id === r.id) ? reg.id : null,
              bib: r.bib,
              name: r.name,
              gender: r.gender,
              ageGroup: r.ageGroup,
              club: r.club || "Individual",
              nationality: r.nationality || "Angola",
              chipTimeMs: hmsToMs(r.chipTime),
              gunTimeMs: hmsToMs(r.gunTime),
              status: r.status.replace(/-/g, "_") as "terminou",
              splits: r.splits.map((s) => ({ label: s.label, timeMs: hmsToMs(s.time) })),
            };
            await tx.result.upsert({ where: { id: r.id }, create: { id: r.id, ...data }, update: data });
          }
          // As classificações são sempre recalculadas no servidor (10.2)
          for (const distanceId of touched) await recomputeRankings(tx, distanceId);
        }, { timeout: 60_000, maxWait: 10_000 });
        return { ok: true };
      }
      case "results.publish": {
        const ev = (await prisma.event.findUnique({ where: { slug: op.eventSlug }, select: { id: true } })) ?? fail("Evento não encontrado.");
        if (!(await canManageEvent(me, ev.id))) fail("Sem permissão.");
        await prisma.event.update({ where: { id: ev.id }, data: { resultsPublished: op.published } });
        await audit(op.published ? "results.publish" : "results.unpublish", "event", ev.id);
        return { ok: true };
      }

      // ───────────── Utilizadores (só admin) ─────────────
      case "user.save": {
        adminOnly();
        const u = op.user;
        const invalidUser = checkUser(u);
        if (invalidUser) fail(invalidUser);
        const phone = u.phone ? `+244${u.phone.replace(/\D/g, "").replace(/^244(?=\d{9}$)/, "")}` : null;
        if (op.isNew) {
          const password = randomBytes(6).toString("base64url");
          const { data, error } = await createAdminClient().auth.admin.createUser({ email: u.email, password, email_confirm: true, user_metadata: { name: u.name } });
          if (error || !data.user) fail(error?.code === "email_exists" ? "Já existe uma conta com este e-mail." : "Não foi possível criar a conta.");
          await prisma.profile.upsert({ where: { id: data.user!.id }, create: { id: data.user!.id, email: u.email, name: u.name, phone, role: u.role, active: u.active }, update: { phone, role: u.role, active: u.active } });
          await audit("user.create", "profile", data.user!.id, { role: u.role });
          return { ok: true, message: `Conta criada. Palavra-passe temporária: ${password} — envie-a à pessoa e peça para a mudar em "Segurança".` };
        }
        if (u.id === me.id && u.role !== "admin") fail("Não pode retirar a si próprio o papel de administrador.");
        await prisma.profile.update({ where: { id: u.id }, data: { name: u.name, phone, role: u.role, active: u.active, club: u.club || null, province: u.province || null } });
        await audit("user.update", "profile", u.id, { role: u.role, active: u.active });
        return { ok: true };
      }
      case "user.remove": {
        adminOnly();
        if (op.id === me.id) fail("Não pode eliminar a sua própria conta aqui.");
        // Como no "Apagar conta" do próprio: cancela as inscrições futuras e anonimiza as passadas (12.5)
        const erased = await eraseRegistrationsOf(op.id);
        const { error } = await createAdminClient().auth.admin.deleteUser(op.id);
        if (error) fail("Não foi possível eliminar a conta.");
        await audit("user.delete", "profile", op.id, erased);
        return { ok: true };
      }

      // ───────────── Banners, patrocinadores, categorias, definições (só admin) ─────────────
      case "banner.save": {
        adminOnly();
        const b = op.banner;
        const invalidBanner = checkBanner(b);
        if (invalidBanner) fail(invalidBanner);
        if (b.image.startsWith("blob:")) fail("A imagem não foi carregada. Volte a escolher a imagem.");
        const data = { title: b.title, subtitle: b.subtitle, imageUrl: b.image, ctaLabel: b.ctaLabel, href: b.href, kind: b.kind, active: b.active, sortOrder: b.order };
        await prisma.banner.upsert({ where: { id: b.id }, create: { id: b.id, ...data }, update: data });
        return { ok: true };
      }
      case "banner.remove":
        adminOnly();
        await prisma.banner.delete({ where: { id: op.id } });
        return { ok: true };
      case "banner.order":
        adminOnly();
        await prisma.$transaction(op.ids.map((id, i) => prisma.banner.update({ where: { id }, data: { sortOrder: i + 1 } })));
        return { ok: true };
      case "sponsor.save": {
        adminOnly();
        const s = op.sponsor;
        const invalidSponsor = checkSponsor(s);
        if (invalidSponsor) fail(invalidSponsor);
        if (s.logo.startsWith("blob:")) fail("O logótipo não foi carregado. Volte a escolher a imagem.");
        const data = { name: s.name, logoUrl: s.logo, url: s.url || null, tier: s.tier, active: s.active };
        await prisma.sponsor.upsert({ where: { id: s.id }, create: { id: s.id, ...data }, update: data });
        return { ok: true };
      }
      case "sponsor.remove":
        adminOnly();
        await prisma.sponsor.delete({ where: { id: op.id } });
        return { ok: true };
      case "category.update": {
        adminOnly();
        const invalidCategory = checkCategory(op.patch);
        if (invalidCategory) fail(invalidCategory);
        await prisma.category.update({ where: { slug: op.slug }, data: { name: op.patch.name, description: op.patch.description } });
        return { ok: true };
      }
      case "category.create": {
        adminOnly();
        const c = op.category;
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(c.slug) || c.slug.length > 60) fail("O endereço da categoria é inválido.");
        const invalidCategory = checkCategory(c);
        if (invalidCategory) fail(invalidCategory);
        await prisma.category.create({ data: { slug: c.slug, name: c.name.trim(), description: c.description.trim() } });
        await audit("category.create", "category", c.slug);
        return { ok: true };
      }
      case "category.remove": {
        adminOnly();
        const category = await prisma.category.findUnique({ where: { slug: op.slug }, select: { _count: { select: { events: true } } } });
        if (!category) throw new Fail("Categoria não encontrada.");
        if (category._count.events > 0) fail("Não é possível eliminar uma categoria com eventos associados.");
        await prisma.category.delete({ where: { slug: op.slug } });
        await audit("category.delete", "category", op.slug);
        return { ok: true };
      }
      case "settings.save": {
        adminOnly();
        const cleaned = cleanSettings(op.settings);
        if ("error" in cleaned) fail(cleaned.error);
        const value = (cleaned as { settings: SiteSettings }).settings as unknown as Prisma.InputJsonValue;
        await prisma.siteSetting.upsert({ where: { key: "site" }, create: { key: "site", value }, update: { value } });
        await audit("settings.update", "site", "site");
        return { ok: true };
      }
    }
  } catch (e) {
    if (e instanceof Fail) return { ok: false, error: e.message };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") return { ok: false, error: "Já existe um registo com estes dados (ex.: endereço do evento ou dorsal repetido)." };
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2003") return { ok: false, error: "Não é possível apagar: há dados ligados a este registo." };
    throw e;
  }
}

// ───────────── Gravar evento (com distâncias, preços, percursos…) ─────────────

async function saveEvent(me: User, ev: AdminEvent, isNew: boolean): Promise<string | undefined> {
  const invalid = checkEvent(ev);
  if (invalid) fail(invalid);
  const isAdmin = me.role === "admin";
  // O id vem do browser: um evento "novo" nunca pode reutilizar o id de um evento existente
  // (senão o upsert actualizava o evento de outra pessoa — revisão de segurança 12.4, A1).
  const existing = await prisma.event.findUnique({ where: { id: ev.id }, select: { status: true, publishedAt: true, featured: true } });
  if (isNew && existing) fail("Este evento já existe. Recarregue a página e tente de novo.");
  if (!isNew && !existing) fail("Evento não encontrado.");
  if (!isNew && !(await canManageEvent(me, ev.id))) fail("Sem permissão para este evento.");
  if (ev.poster.startsWith("blob:") || ev.cover.startsWith("blob:")) fail("O cartaz ainda não foi carregado. Volte a escolher a imagem.");
  if (await prisma.event.findFirst({ where: { slug: ev.slug, id: { not: ev.id } }, select: { id: true } })) fail("Já existe outro evento com este endereço (slug).");

  // D11: o organizador cria em rascunho e não publica — só o admin publica.
  let status = ev.draft ? "rascunho" : uiToDb(ev.status);
  let message: string | undefined;
  if (!isAdmin && status !== "rascunho" && (isNew || existing!.status === "rascunho")) {
    status = "rascunho";
    message = "Guardado como rascunho. A publicação é feita pelo administrador.";
  }
  // Depois de publicado, o estado (publicar, cancelar, terminar) só muda pelo admin (12.4, M4)
  if (!isAdmin && existing && existing.status !== "rascunho") status = existing.status;

  const base = {
    slug: ev.slug,
    title: ev.title,
    edition: ev.edition || 1,
    categorySlug: ev.category,
    date: day(ev.date),
    startTime: ev.startTime,
    province: ev.province,
    city: ev.city,
    venue: ev.venue,
    address: ev.address,
    mapUrl: ev.mapUrl || null,
    posterUrl: ev.poster,
    coverUrl: ev.cover || ev.poster,
    status: status as Prisma.EventCreateInput["status"],
    registrationOpens: day(ev.registrationOpens),
    registrationCloses: day(ev.registrationCloses),
    summary: ev.summary,
    description: ev.description,
    highlights: ev.highlights,
    organizerName: ev.organizer.name,
    organizerPhone: ev.organizer.phone,
    organizerEmail: ev.organizer.email,
    kitLocation: ev.kit.location,
    kitAddress: ev.kit.address,
    kitItems: ev.kit.items,
    kitNotes: ev.kit.notes,
    regulationPdfUrl: ev.regulationPdf?.url && !ev.regulationPdf.url.startsWith("blob:") ? ev.regulationPdf.url : null,
    featured: isAdmin ? !!ev.featured : (existing?.featured ?? false), // destaque na Home: só o admin
    publishedAt: status !== "rascunho" ? (existing?.publishedAt ?? new Date()) : null,
  };

  await prisma.$transaction(
    async (tx) => {
      if (isNew) await tx.event.create({ data: { id: ev.id, ...base } });
      else await tx.event.update({ where: { id: ev.id }, data: base });
      if (isNew && !isAdmin) await tx.eventStaff.create({ data: { eventId: ev.id, profileId: me.id, role: "organizador" } });

      // Listas simples: substituir
      await tx.kitPickup.deleteMany({ where: { eventId: ev.id } });
      await tx.kitPickup.createMany({ data: ev.kit.pickup.map((k) => ({ eventId: ev.id, date: day(k.date), from: k.from, to: k.to })) });
      await tx.scheduleItem.deleteMany({ where: { eventId: ev.id } });
      await tx.scheduleItem.createMany({ data: ev.schedule.map((s, i) => ({ eventId: ev.id, time: s.time, activity: s.activity, sortOrder: i })) });
      await tx.regulationSection.deleteMany({ where: { eventId: ev.id } });
      await tx.regulationSection.createMany({ data: ev.regulation.map((r, i) => ({ eventId: ev.id, title: r.title, items: r.items, sortOrder: i })) });
      await tx.eventSponsor.deleteMany({ where: { eventId: ev.id } });
      await tx.eventSponsor.createMany({ data: ev.sponsorIds.map((sponsorId) => ({ eventId: ev.id, sponsorId })), skipDuplicates: true });

      // Distâncias: actualizar pelas existentes (código), criar novas, apagar só as que não têm inscrições/resultados
      const current = await tx.eventDistance.findMany({ where: { eventId: ev.id }, include: { _count: { select: { registrations: true, results: true } } } });
      for (const [i, d] of ev.distances.entries()) {
        if (d.totalSlots < 0) fail("O número de vagas não pode ser negativo.");
        const found = current.find((c) => c.code === d.id);
        if (found && d.totalSlots < found.slotsTaken) fail(`${d.name}: já há ${found.slotsTaken} vagas ocupadas; o total não pode ser menor.`);
        const fields = { name: d.name, distanceKm: d.distanceKm, startTime: d.startTime, totalSlots: d.totalSlots, minAge: d.minAge, elevationGain: d.elevationGain, timeLimit: d.timeLimit || null, sortOrder: i };
        const dist = found
          ? await tx.eventDistance.update({ where: { id: found.id }, data: fields })
          : await tx.eventDistance.create({ data: { eventId: ev.id, code: d.id, ...fields, bibStart: (i + 1) * 1000 + 1, nextBib: (i + 1) * 1000 + 1 } });
        await tx.priceTier.deleteMany({ where: { distanceId: dist.id } });
        await tx.priceTier.createMany({ data: d.tiers.map((t, k) => ({ distanceId: dist.id, label: t.label, until: day(t.until), price: t.price, sortOrder: k })) });
        const r = ev.routes.find((x) => x.distanceId === d.id);
        if (r) {
          const routeData = { description: r.description, surface: r.surface, path: r.path, elevation: r.elevation, gpxUrl: ev.routeFiles?.[d.id]?.gpx && !ev.routeFiles[d.id].gpx!.startsWith("blob:") ? ev.routeFiles[d.id].gpx : null };
          const route = await tx.eventRoute.upsert({ where: { distanceId: dist.id }, create: { distanceId: dist.id, ...routeData }, update: routeData });
          await tx.routePoint.deleteMany({ where: { routeId: route.id } });
          await tx.routePoint.createMany({ data: r.points.map((p) => ({ routeId: route.id, km: p.km, name: p.name, type: p.type })) });
        }
      }
      for (const c of current.filter((c) => !ev.distances.some((d) => d.id === c.code))) {
        if (c._count.registrations || c._count.results) fail(`Não é possível remover "${c.name}": já tem inscrições ou resultados.`);
        await tx.eventDistance.delete({ where: { id: c.id } });
      }
    },
    { timeout: 20_000 },
  );
  return message;
}
