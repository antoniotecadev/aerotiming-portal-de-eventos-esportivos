// Seed da base de dados de DESENVOLVIMENTO (com dados de demonstração). Para produção: prisma/seed-producao.ts.
// Uso: npm run db:seed   (depois de npm run db:migrate e npm run db:supabase)
//
// - Cria o admin master no Supabase Auth (ADMIN_* do .env) e as contas de teste.
// - Copia os dados mock de src/lib/data para a BD.
// - É idempotente: usa ids determinísticos e "skipDuplicates", por isso pode
//   correr várias vezes sem duplicar nada (não actualiza dados já existentes).

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../src/generated/prisma/client";
import type {
  EventStatus,
  PaymentMethod,
  PaymentStatus,
  RegistrationStatus,
  ResultStatus,
  TShirtSize,
} from "../src/generated/prisma/enums";
import { BANNERS, CATEGORIES, EVENTS, PARTICIPANTS, REGISTRATIONS, RESULTS, SPONSORS } from "./seed-data";
import { seeded } from "../src/lib/route-helpers";
import type { EventDistance, Participant } from "../src/lib/types";

// ───────────── Configuração ─────────────

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta a variável ${name} no .env`);
  return v;
}

if (process.env.NODE_ENV === "production") {
  throw new Error("O seed é só para desenvolvimento. Não corra em produção.");
}
// Protecção extra (12.7): com o .env de produção (site fora de localhost) recusa criar dados de demonstração.
// Para a produção use "npm run db:seed:producao". Para forçar numa BD de testes remota: SEED_DEMO_FORCE=1.
const siteHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost").hostname;
  } catch {
    return "";
  }
})();
if (!["localhost", "127.0.0.1"].includes(siteHost) && process.env.SEED_DEMO_FORCE !== "1") {
  throw new Error(`NEXT_PUBLIC_SITE_URL aponta para ${siteHost}: isto parece produção. Use "npm run db:seed:producao" (sem dados de demonstração).`);
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env("DIRECT_URL") }) });
// API de administração do Supabase Auth (REST). Usada directamente com fetch porque
// o @supabase/supabase-js recente exige Node 22+ (WebSocket nativo).
const AUTH_URL = `${env("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/admin/users`;
const AUTH_HEADERS = { apikey: env("SUPABASE_SECRET_KEY"), Authorization: `Bearer ${env("SUPABASE_SECRET_KEY")}`, "Content-Type": "application/json" };

async function authAdmin<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: AUTH_HEADERS });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Supabase Auth ${res.status}: ${body.msg ?? body.message ?? body.error_description ?? JSON.stringify(body)}`);
  return body as T;
}

const TEST_ATHLETE = { email: "atleta@exemplo.ao", name: "Carlos Mendonça" };
const TEST_ORGANIZER = { email: "organizador@exemplo.ao", name: "Helena Organizadora" };
const ORGANIZER_EVENTS = ["maratona-internacional-de-luanda-2026", "gran-fondo-serra-da-leba-2026"];

// ───────────── Utilitários ─────────────

const day = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00Z`);

function msFromHms(t: string | null) {
  if (!t) return null;
  const [h, m, s] = t.split(":").map(Number);
  return ((h * 60 + m) * 60 + s) * 1000;
}

function eventStatus(s: string): EventStatus {
  if (s === "ultimas-vagas" || s === "esgotado") return "inscricoes_abertas"; // passam a ser calculados
  return s.replace(/-/g, "_") as EventStatus;
}

/** Preço da fase em vigor numa data. */
function priceAt(d: EventDistance, iso: string) {
  const date = iso.slice(0, 10);
  return d.tiers.find((t) => t.until >= date) ?? d.tiers[d.tiers.length - 1];
}

/** Dados do atleta que o mock não tem (BI, telefone…), gerados de forma estável a partir do id. */
function athleteExtras(p: Participant) {
  let h = 0;
  for (const c of p.id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const rnd = seeded(h || 1);
  const birthYear =
    p.ageGroup === "Júnior" ? 2008 : p.ageGroup === "Sénior" ? 1996 : p.ageGroup === "Veterano 35" ? 1986 : p.ageGroup === "Veterano 45" ? 1976 : 1965;
  const digits = (n: number) => Array.from({ length: n }, () => Math.floor(rnd() * 10)).join("");
  const sizes: TShirtSize[] = ["S", "M", "M", "L", "L", "XL"];
  return {
    birthDate: day(`${birthYear - Math.floor(rnd() * 4)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}`),
    documentNumber: `${digits(9)}LA${digits(3)}`,
    phone: `+2449${digits(8)}`,
    emergencyPhone: `+2449${digits(8)}`,
    tshirt: sizes[Math.floor(rnd() * sizes.length)],
    method: (["multicaixa_express", "transferencia", "deposito", "kwik"] as PaymentMethod[])[Math.floor(rnd() * 4)],
    roll: rnd(),
  };
}

// ───────────── Contas (Supabase Auth) ─────────────

async function ensureAuthUser(email: string, password: string, name: string) {
  for (let page = 1; ; page++) {
    const { users } = await authAdmin<{ users: { id: string; email?: string }[] }>(`${AUTH_URL}?page=${page}&per_page=1000`);
    const found = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return { id: found.id, created: false };
    if (users.length < 1000) break;
  }
  const user = await authAdmin<{ id: string }>(AUTH_URL, {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }),
  });
  return { id: user.id, created: true };
}

async function ensureProfile(id: string, email: string, name: string, role: "atleta" | "organizador" | "admin") {
  // O trigger (prisma/sql/supabase-setup.sql) já cria o perfil; o upsert cobre o caso de não estar aplicado.
  await prisma.profile.upsert({
    where: { id },
    create: { id, email, name, role },
    update: { role },
  });
}

async function seedUsers() {
  const admin = await ensureAuthUser(env("ADMIN_EMAIL"), env("ADMIN_PASSWORD"), process.env.ADMIN_NAME || "Administrador");
  await ensureProfile(admin.id, env("ADMIN_EMAIL"), process.env.ADMIN_NAME || "Administrador", "admin");

  const testPassword = env("SEED_TEST_PASSWORD");
  const athlete = await ensureAuthUser(TEST_ATHLETE.email, testPassword, TEST_ATHLETE.name);
  await ensureProfile(athlete.id, TEST_ATHLETE.email, TEST_ATHLETE.name, "atleta");
  await prisma.profile.update({
    where: { id: athlete.id },
    data: {
      phone: "+244923481902", birthDate: day("1988-06-14"), gender: "M", documentType: "BI", documentNumber: "006894121LA042",
      province: "Luanda", city: "Kilamba", club: "Kilamba Runners", tshirt: "M", bloodType: "O+",
      emergencyName: "Helena Mendonça", emergencyPhone: "+244912345678", emergencyRelation: "Esposa",
    },
  });

  const organizer = await ensureAuthUser(TEST_ORGANIZER.email, testPassword, TEST_ORGANIZER.name);
  await ensureProfile(organizer.id, TEST_ORGANIZER.email, TEST_ORGANIZER.name, "organizador");

  console.log(`  contas: admin ${admin.created ? "criado" : "já existia"}, atleta ${athlete.created ? "criado" : "já existia"}, organizador ${organizer.created ? "criado" : "já existia"}`);
  return { adminId: admin.id, athleteId: athlete.id, organizerId: organizer.id };
}

// ───────────── Catálogo ─────────────

async function seedCatalog() {
  await prisma.category.createMany({
    data: CATEGORIES.map((c, i) => ({ slug: c.slug, name: c.name, description: c.description, sortOrder: i })),
    skipDuplicates: true,
  });
  await prisma.sponsor.createMany({
    data: SPONSORS.map((s, i) => ({ id: s.id, name: s.name, logoUrl: s.logo, url: s.url, tier: s.tier, active: s.active, sortOrder: i })),
    skipDuplicates: true,
  });
  await prisma.banner.createMany({
    data: BANNERS.map((b) => ({
      id: b.id, title: b.title, subtitle: b.subtitle, imageUrl: b.image, ctaLabel: b.ctaLabel, href: b.href, kind: b.kind, active: b.active, sortOrder: b.order,
    })),
    skipDuplicates: true,
  });
  const settings: { key: string; value: Prisma.InputJsonValue }[] = [
    {
      key: "payment_accounts",
      value: {
        // Dados FICTÍCIOS — substituir pelas contas reais da ConexãoSport no painel (Definições)
        iban: [{ bank: "Banco Palanca", holder: "ConexãoSport, Lda.", iban: "AO06 0040 0000 1234 5678 1019 0" }],
        multicaixaExpress: { phone: "+244923000000", holder: "ConexãoSport, Lda." },
        kwik: { id: "923000000", holder: "ConexãoSport, Lda." },
        depositInstructions: "Depósito em qualquer balcão do Banco Palanca, para o IBAN indicado. Escreva o código da inscrição no talão.",
        whatsapp: "244923000000", // para onde os atletas enviam o comprovativo
        proofDeadlineHours: 72,
      },
    },
    // Contactos e redes sociais do site (painel → Definições; rodapé, Contacto, Ajuda, Sobre)
    {
      key: "site",
      value: {
        siteName: "ConexãoSport",
        tagline: "Eventos desportivos em Angola",
        email: "geral@conexaosport.ao",
        phone: "+244 923 000 000",
        whatsapp: "+244 923 000 000",
        address: "Talatona, Luanda — Angola",
        facebook: "https://facebook.com/",
        instagram: "https://instagram.com/",
        tiktok: "https://tiktok.com/",
        youtube: "https://youtube.com/",
        linkedin: "https://linkedin.com/",
      },
    },
  ];
  await prisma.siteSetting.createMany({ data: settings, skipDuplicates: true });
}

// ───────────── Eventos ─────────────

async function seedEvents(organizerId: string) {
  for (const ev of EVENTS) {
    await prisma.event.upsert({
      where: { slug: ev.slug },
      update: {},
      create: {
        id: ev.id,
        slug: ev.slug,
        title: ev.title,
        edition: ev.edition,
        categorySlug: ev.category,
        date: day(ev.date),
        startTime: ev.startTime,
        province: ev.province,
        city: ev.city,
        venue: ev.venue,
        address: ev.address,
        mapUrl: ev.mapUrl,
        posterUrl: ev.poster,
        coverUrl: ev.cover,
        status: eventStatus(ev.status),
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
        featured: ev.featured ?? false,
        resultsPublished: ev.status === "terminado",
        publishedAt: new Date(ev.createdAt),
        createdAt: new Date(ev.createdAt),
      },
    });

    const distIds = new Map(ev.distances.map((d) => [d.id, `${ev.id}-${d.id}`]));
    await prisma.eventDistance.createMany({
      data: ev.distances.map((d, i) => {
        const bibStart = (i + 1) * 1000 + 1;
        const used = PARTICIPANTS.filter((p) => p.eventSlug === ev.slug && p.distanceId === d.id && p.paymentStatus === "confirmado")
          .map((p) => Number(p.bib))
          .filter((n) => n >= bibStart && n < bibStart + 999);
        return {
          id: distIds.get(d.id)!,
          eventId: ev.id,
          code: d.id,
          name: d.name,
          distanceKm: d.distanceKm,
          startTime: d.startTime,
          totalSlots: d.totalSlots,
          slotsTaken: d.slotsTaken,
          minAge: d.minAge,
          elevationGain: d.elevationGain,
          timeLimit: d.timeLimit,
          bibStart,
          nextBib: used.length ? Math.max(...used) + 1 : bibStart,
          sortOrder: i,
        };
      }),
      skipDuplicates: true,
    });
    await prisma.priceTier.createMany({
      data: ev.distances.flatMap((d) =>
        d.tiers.map((t, i) => ({ id: `${distIds.get(d.id)}-t${i}`, distanceId: distIds.get(d.id)!, label: t.label, until: day(t.until), price: t.price, sortOrder: i })),
      ),
      skipDuplicates: true,
    });
    await prisma.eventRoute.createMany({
      data: ev.routes.map((r) => ({
        id: `${distIds.get(r.distanceId)}-route`,
        distanceId: distIds.get(r.distanceId)!,
        description: r.description,
        surface: r.surface,
        path: r.path,
        elevation: r.elevation,
      })),
      skipDuplicates: true,
    });
    await prisma.routePoint.createMany({
      data: ev.routes.flatMap((r) =>
        r.points.map((pt, i) => ({ id: `${distIds.get(r.distanceId)}-route-p${i}`, routeId: `${distIds.get(r.distanceId)}-route`, km: pt.km, name: pt.name, type: pt.type })),
      ),
      skipDuplicates: true,
    });
    await prisma.kitPickup.createMany({
      data: ev.kit.pickup.map((k, i) => ({ id: `${ev.id}-kit${i}`, eventId: ev.id, date: day(k.date), from: k.from, to: k.to })),
      skipDuplicates: true,
    });
    await prisma.scheduleItem.createMany({
      data: ev.schedule.map((s, i) => ({ id: `${ev.id}-s${i}`, eventId: ev.id, time: s.time, activity: s.activity, sortOrder: i })),
      skipDuplicates: true,
    });
    await prisma.regulationSection.createMany({
      data: ev.regulation.map((r, i) => ({ id: `${ev.id}-r${i}`, eventId: ev.id, title: r.title, items: r.items, sortOrder: i })),
      skipDuplicates: true,
    });
    await prisma.eventSponsor.createMany({
      data: ev.sponsorIds.map((sponsorId) => ({ eventId: ev.id, sponsorId })),
      skipDuplicates: true,
    });
    if (ORGANIZER_EVENTS.includes(ev.slug)) {
      await prisma.eventStaff.createMany({ data: [{ eventId: ev.id, profileId: organizerId, role: "organizador" }], skipDuplicates: true });
    }
  }
}

// ───────────── Inscrições, pagamentos e resultados ─────────────

async function seedRegistrations(adminId: string, athleteId: string) {
  const eventBySlug = new Map(EVENTS.map((e) => [e.slug, e]));
  const demoBySlug = new Map(REGISTRATIONS.map((r) => [r.eventSlug, r]));
  const ordered = [...PARTICIPANTS].sort((a, b) => a.registeredAt.localeCompare(b.registeredAt) || a.id.localeCompare(b.id));

  const registrations: Prisma.RegistrationCreateManyInput[] = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  let maxSeq = 0;

  ordered.forEach((p, i) => {
    const ev = eventBySlug.get(p.eventSlug)!;
    const dist = ev.distances.find((d) => d.id === p.distanceId)!;
    const x = athleteExtras(p);
    const isDemo = p.id.startsWith("demo-");
    const demo = isDemo ? demoBySlug.get(p.eventSlug) : undefined;

    const status: RegistrationStatus = demo
      ? demo.status === "confirmada" ? "confirmada" : demo.status === "cancelada" ? "cancelada" : "pagamento_pendente"
      : p.paymentStatus === "confirmado" ? "confirmada" : p.paymentStatus === "cancelado" ? "cancelada" : "pagamento_pendente";

    const code = demo?.code ?? `CS-${p.registeredAt.slice(0, 4)}-${String(i + 1).padStart(5, "0")}`;
    maxSeq = Math.max(maxSeq, Number(code.slice(-5)));
    const tier = priceAt(dist, p.registeredAt);
    const registeredAt = new Date(p.registeredAt);
    const past = ev.status === "terminado";

    registrations.push({
      id: p.id,
      code,
      eventId: ev.id,
      distanceId: `${ev.id}-${dist.id}`,
      userId: isDemo ? athleteId : null,
      bib: status === "confirmada" ? p.bib : null,
      status,
      price: demo?.payment.amount ?? tier.price,
      priceTierLabel: tier.label,
      athleteName: p.name,
      gender: p.gender,
      birthDate: isDemo ? day("1988-06-14") : x.birthDate,
      ageGroup: p.ageGroup,
      documentType: p.nationality === "Angola" ? "BI" : "PASSAPORTE",
      documentNumber: isDemo ? "006894121LA042" : x.documentNumber,
      phone: isDemo ? "+244923481902" : x.phone,
      province: p.province,
      club: p.club,
      nationality: p.nationality,
      tshirt: demo?.tshirt ?? x.tshirt,
      emergencyName: isDemo ? "Helena Mendonça" : "Contacto de emergência",
      emergencyPhone: isDemo ? "+244912345678" : x.emergencyPhone,
      acceptedRulesAt: registeredAt,
      healthDeclarationAt: registeredAt,
      kitStatus: past || demo?.kitStatus === "levantado" ? "levantado" : "por_levantar",
      cancelledAt: status === "cancelada" ? new Date(registeredAt.getTime() + 2 * 86_400_000) : null,
      createdAt: registeredAt,
    });

    const method: PaymentMethod = demo ? (demo.payment.method.replace(/-/g, "_") as PaymentMethod) : x.method;
    const payStatus: PaymentStatus =
      status === "confirmada" ? "confirmado" : status === "cancelada" ? "cancelado" : x.roll < 0.4 ? "em_analise" : "pendente";
    payments.push({
      id: `${p.id}-pay`,
      registrationId: p.id,
      method,
      status: payStatus,
      amount: demo?.payment.amount ?? tier.price,
      reference: code,
      notes: payStatus === "em_analise" ? "Comprovativo enviado pelo WhatsApp (dados de demonstração)." : null,
      proofUploadedAt: payStatus === "em_analise" ? new Date(registeredAt.getTime() + 86_400_000) : null,
      expiresAt: payStatus === "pendente" ? new Date(registeredAt.getTime() + 72 * 3_600_000) : null,
      confirmedAt: payStatus === "confirmado" ? new Date(demo?.payment.confirmedAt ?? registeredAt.getTime() + 86_400_000) : null,
      confirmedById: payStatus === "confirmado" ? adminId : null,
      createdAt: registeredAt,
    });
  });

  for (let i = 0; i < registrations.length; i += 500) {
    await prisma.registration.createMany({ data: registrations.slice(i, i + 500), skipDuplicates: true });
  }
  for (let i = 0; i < payments.length; i += 500) {
    await prisma.payment.createMany({ data: payments.slice(i, i + 500), skipDuplicates: true });
  }

  const year = "2026";
  await prisma.counter.upsert({
    where: { key: `registration:${year}` },
    create: { key: `registration:${year}`, value: maxSeq },
    update: {},
  });

  const results: Prisma.ResultCreateManyInput[] = RESULTS.map((r) => {
    const ev = eventBySlug.get(r.eventSlug)!;
    return {
      id: r.id,
      eventId: ev.id,
      distanceId: `${ev.id}-${r.distanceId}`,
      registrationId: r.id.replace(/-r$/, ""),
      bib: r.bib,
      name: r.name,
      gender: r.gender,
      ageGroup: r.ageGroup,
      club: r.club,
      nationality: r.nationality,
      position: r.position,
      positionGender: r.positionGender,
      positionAgeGroup: r.positionAgeGroup,
      chipTimeMs: msFromHms(r.chipTime),
      gunTimeMs: msFromHms(r.gunTime),
      status: r.status.replace(/-/g, "_") as ResultStatus,
      splits: r.splits.map((s) => ({ label: s.label, timeMs: msFromHms(s.time) })),
    };
  });
  await prisma.result.createMany({ data: results, skipDuplicates: true });
}

// ───────────── Execução ─────────────

async function main() {
  // A base de dados de produção tem a marca site_settings.ambiente = "producao" (seed-producao.ts): nunca semear lá
  const marca = await prisma.siteSetting.findUnique({ where: { key: "ambiente" } });
  if (marca?.value === "producao") {
    throw new Error("Esta base de dados é a de PRODUÇÃO (site_settings.ambiente). O seed de demonstração só corre numa base de desenvolvimento.");
  }
  console.log("A semear a base de dados de desenvolvimento…");
  const { adminId, athleteId, organizerId } = await seedUsers();
  await seedCatalog();
  console.log("  catálogo ✔");
  await seedEvents(organizerId);
  console.log("  eventos ✔");
  await seedRegistrations(adminId, athleteId);
  console.log("  inscrições, pagamentos e resultados ✔");

  const [events, regs, pays, results, profiles] = await Promise.all([
    prisma.event.count(),
    prisma.registration.count(),
    prisma.payment.groupBy({ by: ["status"], _count: true }),
    prisma.result.count(),
    prisma.profile.groupBy({ by: ["role"], _count: true }),
  ]);
  console.log(`\nTotais: ${events} eventos · ${regs} inscrições · ${results} resultados`);
  console.log(`Pagamentos: ${pays.map((p) => `${p.status} ${p._count}`).join(" · ")}`);
  console.log(`Perfis: ${profiles.map((p) => `${p.role} ${p._count}`).join(" · ")}`);
}

main()
  .catch((e) => {
    console.error("\n✖ O seed falhou:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
