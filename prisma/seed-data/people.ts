import type { Gender, Participant, PaymentStatus, RaceResult, Registration, User } from "../../src/lib/types";
import { EVENTS } from "./events";
import { PROVINCES } from "./catalog";
import { seeded } from "../../src/lib/route-helpers";

const MALE = ["António", "Manuel", "João", "Domingos", "Paulo", "Adilson", "Edson", "Hélder", "Mário", "Nelson", "Osvaldo", "Valdemar", "Kiluanje", "Ngola", "Zola", "Feliciano", "Agostinho", "Bento", "Celestino", "Délcio", "Evaristo", "Gelson", "Ivandro", "Jacinto", "Lukeny", "Mateus", "Nzinga", "Pedro", "Simão", "Teodoro"];
const FEMALE = ["Ana", "Maria", "Esperança", "Joana", "Luzia", "Neide", "Rosa", "Teresa", "Yola", "Ngueza", "Kiesse", "Wizi", "Djamila", "Elsa", "Fátima", "Graça", "Helena", "Isabel", "Josefa", "Kátia", "Leopoldina", "Madalena", "Nádia", "Odete", "Palmira", "Rebeca", "Sónia", "Tânia", "Vanda", "Zenaide"];
const SURNAMES = ["dos Santos", "Fernandes", "da Silva", "Mendonça", "Domingos", "Neto", "Cassoma", "Chivela", "Kiala", "Lourenço", "Mateus", "Ngunza", "Pascoal", "Quintas", "Sapalo", "Tchipa", "Upale", "Vunge", "Zau", "Bumba", "Capitango", "Dala", "Ebo", "Finda", "Gaspar", "Kamalata", "Lussati", "Muhongo", "Nzuzi", "Sebastião"];
const CLUBS = ["Individual", "Individual", "Individual", "1.º de Agosto", "Petro de Luanda", "Kilamba Runners", "Luanda Night Runners", "Benfica de Luanda", "Interclube", "Talatona Running Club", "Huambo Atletismo", "Lubango Bike Team", "Namibe Trail Clube", "Benguela Corre"];
const FOREIGN = [
  { name: "Kelvin Kiprop", gender: "M" as Gender, nat: "Quénia" },
  { name: "Tsegaye Mekonnen", gender: "M" as Gender, nat: "Etiópia" },
  { name: "Gotytom Gebreslase", gender: "F" as Gender, nat: "Etiópia" },
  { name: "Ana Sofia Vasconcelos", gender: "F" as Gender, nat: "Portugal" },
  { name: "Mariana Gouveia", gender: "F" as Gender, nat: "Brasil" },
];

function ageGroup(age: number) {
  if (age < 20) return "Júnior";
  if (age < 35) return "Sénior";
  if (age < 45) return "Veterano 35";
  if (age < 55) return "Veterano 45";
  return "Veterano 55+";
}

function hms(totalSeconds: number) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

function paceOf(seconds: number, km: number) {
  const p = seconds / km;
  return `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}`;
}

// Segundos por km de um atleta "médio" por categoria (ajustado por sexo/idade/aleatório)
const BASE_PACE: Record<string, number> = { corrida: 330, caminhada: 600, trail: 480, ciclismo: 110, btt: 160, triatlo: 190 };

const PARTICIPANTS_PER_EVENT = 96;

function buildParticipants(): Participant[] {
  const out: Participant[] = [];
  EVENTS.forEach((ev, evIndex) => {
    if (ev.status === "brevemente") return;
    const rnd = seeded(1000 + evIndex * 97);
    const past = ev.status === "terminado";
    for (let i = 0; i < PARTICIPANTS_PER_EVENT; i++) {
      const dist = ev.distances[Math.floor(rnd() * ev.distances.length)];
      const foreign = i < FOREIGN.length && ev.category === "corrida" && rnd() > 0.4 ? FOREIGN[i] : null;
      const gender: Gender = foreign ? foreign.gender : rnd() > 0.38 ? "M" : "F";
      const first = (gender === "M" ? MALE : FEMALE)[Math.floor(rnd() * 30)];
      const name = foreign ? foreign.name : `${first} ${SURNAMES[Math.floor(rnd() * 30)]}`;
      const age = 16 + Math.floor(rnd() * 46);
      const roll = rnd();
      const paymentStatus: PaymentStatus = past ? "confirmado" : roll < 0.78 ? "confirmado" : roll < 0.95 ? "pendente" : "cancelado";
      const day = 1 + Math.floor(rnd() * 27);
      out.push({
        id: `${ev.id}-p${i + 1}`,
        eventSlug: ev.slug,
        distanceId: dist.id,
        bib: String((ev.distances.indexOf(dist) + 1) * 1000 + i + 1),
        name,
        gender,
        ageGroup: ageGroup(age),
        club: foreign ? "Elite internacional" : CLUBS[Math.floor(rnd() * CLUBS.length)],
        province: rnd() > 0.5 ? ev.province : PROVINCES[Math.floor(rnd() * PROVINCES.length)],
        nationality: foreign ? foreign.nat : "Angola",
        paymentStatus,
        registeredAt: `${ev.registrationOpens.slice(0, 8)}${String(day).padStart(2, "0")}T10:00:00+01:00`,
      });
    }
  });
  // O atleta de demonstração (Carlos Mendonça) inscrito em provas passadas
  const demo = [
    { slug: "10k-noturno-da-marginal-2026", dist: "10k", bib: "3421" },
    { slug: "meia-maratona-do-huambo-2026", dist: "21k", bib: "1777" },
    { slug: "maratona-internacional-de-luanda-2026", dist: "42k", bib: "1205" },
    { slug: "gran-fondo-serra-da-leba-2026", dist: "85k", bib: "2184" },
  ];
  demo.forEach((d, i) => {
    const ev = EVENTS.find((e) => e.slug === d.slug)!;
    out.push({
      id: `demo-p${i}`,
      eventSlug: d.slug,
      distanceId: d.dist,
      bib: d.bib,
      name: "Carlos Mendonça",
      gender: "M",
      ageGroup: "Veterano 35",
      club: "Kilamba Runners",
      province: "Luanda",
      nationality: "Angola",
      paymentStatus: ev.status === "terminado" || i === 2 ? "confirmado" : "pendente",
      registeredAt: `${ev.registrationOpens}T12:00:00+01:00`,
    });
  });
  return out;
}

export const PARTICIPANTS: Participant[] = buildParticipants();

function buildResults(): RaceResult[] {
  const out: RaceResult[] = [];
  EVENTS.filter((e) => e.status === "terminado").forEach((ev, evIndex) => {
    const rnd = seeded(5000 + evIndex * 31);
    ev.distances.forEach((dist) => {
      const field = PARTICIPANTS.filter((p) => p.eventSlug === ev.slug && p.distanceId === dist.id);
      const timed = field.map((p) => {
        const elite = p.club === "Elite internacional" ? 0.62 : 1;
        const genderF = p.gender === "F" ? 1.1 : 1;
        const ageF = p.ageGroup.startsWith("Veterano 55") ? 1.18 : p.ageGroup.startsWith("Veterano 45") ? 1.08 : 1;
        const demoF = p.name === "Carlos Mendonça" ? 0.78 : 1;
        const secs = BASE_PACE[ev.category] * dist.distanceKm * elite * genderF * ageF * demoF * (0.72 + rnd() * 0.6);
        const r = rnd();
        const status: RaceResult["status"] = p.name === "Carlos Mendonça" ? "terminou" : r < 0.04 ? "desistiu" : r < 0.06 ? "nao-partiu" : "terminou";
        return { p, secs, status };
      });
      const finishers = timed.filter((t) => t.status === "terminou").sort((a, b) => a.secs - b.secs);
      const genderCount: Record<string, number> = {};
      const groupCount: Record<string, number> = {};
      finishers.forEach((t, idx) => {
        genderCount[t.p.gender] = (genderCount[t.p.gender] ?? 0) + 1;
        const gk = `${t.p.gender}-${t.p.ageGroup}`;
        groupCount[gk] = (groupCount[gk] ?? 0) + 1;
        const fractions = dist.distanceKm >= 10 ? [0.25, 0.5, 0.75] : [0.5];
        out.push({
          id: `${t.p.id}-r`,
          eventSlug: ev.slug,
          distanceId: dist.id,
          bib: t.p.bib,
          name: t.p.name,
          gender: t.p.gender,
          ageGroup: t.p.ageGroup,
          club: t.p.club,
          nationality: t.p.nationality,
          position: idx + 1,
          positionGender: genderCount[t.p.gender],
          positionAgeGroup: groupCount[gk],
          chipTime: hms(t.secs),
          gunTime: hms(t.secs + 4 + idx * 0.6),
          pace: paceOf(t.secs, dist.distanceKm),
          status: "terminou",
          splits: fractions.map((f) => ({ label: `${Math.round(dist.distanceKm * f * 10) / 10} km`, time: hms(t.secs * f * (0.97 + f * 0.03)) })),
        });
      });
      timed.filter((t) => t.status !== "terminou").forEach((t) => {
        out.push({
          id: `${t.p.id}-r`,
          eventSlug: ev.slug,
          distanceId: dist.id,
          bib: t.p.bib,
          name: t.p.name,
          gender: t.p.gender,
          ageGroup: t.p.ageGroup,
          club: t.p.club,
          nationality: t.p.nationality,
          position: null,
          positionGender: null,
          positionAgeGroup: null,
          chipTime: null,
          gunTime: null,
          pace: null,
          status: t.status,
          splits: [],
        });
      });
    });
  });
  return out;
}

export const RESULTS: RaceResult[] = buildResults();

export const USERS: User[] = [
  {
    id: "u-1",
    name: "Carlos Mendonça",
    email: "carlos@exemplo.ao",
    phone: "+244 923 481 902",
    role: "atleta",
    birthDate: "1988-06-14",
    gender: "M",
    documentType: "BI",
    documentNumber: "006894121LA042",
    province: "Luanda",
    city: "Kilamba",
    club: "Kilamba Runners",
    tshirt: "M",
    bloodType: "O+",
    emergencyContact: { name: "Helena Mendonça", phone: "+244 912 345 678", relation: "Esposa" },
    createdAt: "2025-02-10T10:00:00+01:00",
    active: true,
  },
  {
    id: "u-2",
    name: "Administrador ConexãoSport",
    email: "admin@conexaosport.ao",
    phone: "+244 923 000 000",
    role: "admin",
    birthDate: "1985-01-01",
    gender: "F",
    documentType: "BI",
    documentNumber: "000000000LA000",
    province: "Luanda",
    city: "Talatona",
    club: "—",
    tshirt: "S",
    emergencyContact: { name: "—", phone: "—", relation: "—" },
    createdAt: "2024-01-01T10:00:00+01:00",
    active: true,
  },
  ...Array.from({ length: 22 }, (_, i): User => {
    const rnd = seeded(9000 + i);
    const gender: Gender = rnd() > 0.45 ? "M" : "F";
    const first = (gender === "M" ? MALE : FEMALE)[Math.floor(rnd() * 30)];
    const last = SURNAMES[Math.floor(rnd() * 30)];
    return {
      id: `u-${i + 3}`,
      name: `${first} ${last}`,
      email: `${first.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}.${i + 3}@exemplo.ao`,
      phone: `+244 9${Math.floor(10 + rnd() * 89)} ${Math.floor(100 + rnd() * 899)} ${Math.floor(100 + rnd() * 899)}`,
      role: i === 0 ? "organizador" : "atleta",
      birthDate: `${1965 + Math.floor(rnd() * 40)}-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}`,
      gender,
      documentType: "BI",
      documentNumber: `00${Math.floor(1000000 + rnd() * 8999999)}LA0${Math.floor(10 + rnd() * 89)}`,
      province: PROVINCES[Math.floor(rnd() * PROVINCES.length)],
      city: "—",
      club: CLUBS[Math.floor(rnd() * CLUBS.length)],
      tshirt: (["S", "M", "L", "XL"] as const)[Math.floor(rnd() * 4)],
      emergencyContact: { name: "—", phone: "—", relation: "—" },
      createdAt: `2026-0${1 + Math.floor(rnd() * 9)}-1${Math.floor(rnd() * 9)}T10:00:00+01:00`,
      active: rnd() > 0.08,
    };
  }),
];

/** Inscrições do utilizador de demonstração (u-1), usadas no perfil. */
export const REGISTRATIONS: Registration[] = [
  {
    id: "reg-1",
    code: "CS-2026-01205",
    userId: "u-1",
    userName: "Carlos Mendonça",
    eventSlug: "maratona-internacional-de-luanda-2026",
    distanceId: "42k",
    bib: "1205",
    status: "confirmada",
    tshirt: "M",
    payment: { method: "multicaixa-express", state: "confirmado", amount: 20000, reference: "CS-2026-01205", confirmedAt: "2026-09-12T14:22:00+01:00" },
    kitStatus: "por-levantar",
    createdAt: "2026-09-12T14:20:00+01:00",
  },
  {
    id: "reg-2",
    code: "CS-2026-02184",
    userId: "u-1",
    userName: "Carlos Mendonça",
    eventSlug: "gran-fondo-serra-da-leba-2026",
    distanceId: "85k",
    bib: "2184",
    status: "pagamento-pendente",
    tshirt: "M",
    payment: { method: "transferencia", state: "pendente", amount: 32000, reference: "CS-2026-02184", expiresAt: "2026-10-17T14:00:00+01:00" },
    kitStatus: "por-levantar",
    createdAt: "2026-10-14T14:00:00+01:00",
  },
  {
    id: "reg-3",
    code: "CS-2026-03421",
    userId: "u-1",
    userName: "Carlos Mendonça",
    eventSlug: "10k-noturno-da-marginal-2026",
    distanceId: "10k",
    bib: "3421",
    status: "confirmada",
    tshirt: "M",
    payment: { method: "multicaixa-express", state: "confirmado", amount: 12000, reference: "CS-2026-03421", confirmedAt: "2026-07-02T09:10:00+01:00" },
    kitStatus: "levantado",
    createdAt: "2026-07-02T09:05:00+01:00",
  },
  {
    id: "reg-4",
    code: "CS-2026-01777",
    userId: "u-1",
    userName: "Carlos Mendonça",
    eventSlug: "meia-maratona-do-huambo-2026",
    distanceId: "21k",
    bib: "1777",
    status: "confirmada",
    tshirt: "M",
    payment: { method: "transferencia", state: "confirmado", amount: 12000, reference: "CS-2026-01777", confirmedAt: "2026-06-20T16:00:00+01:00" },
    kitStatus: "levantado",
    createdAt: "2026-06-19T11:00:00+01:00",
  },
];
