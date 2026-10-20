"use server";

import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { today } from "@/lib/today";
import type { PaymentAccounts, PaymentMethod } from "@/lib/types";
import { getCurrentUser } from "../auth";
import { toDay } from "../mappers";
import { LIMITS, clientIp, hitAll, tooManyMessage } from "../rate-limit";
import {
  ageGroupFor,
  ageOn,
  expireStaleRegistrations,
  nextRegistrationCode,
  paymentAccountsFor,
  releaseSlot,
  takeSlot,
} from "../registrations";

const digits = (v: string) => v.replace(/\D/g, "");
const toE164 = (v: string) => {
  const d = digits(v);
  return `+244${d.startsWith("244") && d.length > 9 ? d.slice(3) : d}`;
};
const aoPhone = (msg: string) => z.string().refine((v) => /^9\d{8}$/.test(digits(v).replace(/^244(?=\d{9}$)/, "")), { message: msg });

const schema = z.object({
  eventSlug: z.string().min(1),
  distanceCode: z.string().min(1, { message: "Escolha uma distância para continuar." }),
  method: z.enum(["multicaixa-express", "transferencia", "deposito", "kwik"], { message: "Escolha como vai pagar." }),
  name: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => v.split(" ").length >= 2, { message: "Escreva o nome e o apelido (como no BI)." }),
  gender: z.enum(["M", "F"], { message: "Escolha o sexo." }),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Indique a data de nascimento." }),
  documentType: z.enum(["BI", "Passaporte"]),
  documentNumber: z.string().trim().toUpperCase().min(6, { message: "Escreva o número do documento." }),
  phone: aoPhone("Escreva um número de telemóvel válido (9 dígitos)."),
  email: z.union([z.literal(""), z.email({ message: "Este e-mail não parece correcto." })]).optional(),
  province: z.string().min(1, { message: "Escolha a província." }),
  club: z.string().trim().max(80).optional().default(""),
  tshirt: z.enum(["XS", "S", "M", "L", "XL", "XXL"], { message: "Escolha o tamanho da t-shirt." }),
  emergencyName: z.string().trim().min(2, { message: "Quem devemos contactar em caso de emergência?" }),
  emergencyPhone: aoPhone("Escreva o telemóvel do contacto de emergência."),
  emergencyRelation: z.string().trim().max(40).optional().default(""),
  bloodType: z.string().max(10).optional().default(""),
  medicalNotes: z.string().trim().max(500).optional().default(""),
  acceptRules: z.literal(true, { message: "Precisa de aceitar o regulamento." }),
  acceptHealth: z.literal(true, { message: "Precisa de confirmar a declaração de saúde." }),
  /** true quando a inscrição é para o dono da conta → guarda os dados no perfil */
  saveToProfile: z.boolean().optional().default(true),
});

export type RegistrationInput = z.input<typeof schema>;

export type RegistrationResult =
  | {
      ok: true;
      code: string;
      amount: number;
      method: PaymentMethod;
      expiresAt: string;
      accounts: PaymentAccounts;
    }
  | { ok: false; error: string; field?: string; step?: number };

/** Em que passo do formulário está cada campo (para levar o atleta ao erro). */
const STEP_OF: Record<string, number> = {
  distanceCode: 1,
  name: 2, gender: 2, birthDate: 2, documentType: 2, documentNumber: 2, phone: 2, email: 2, province: 2, club: 2, tshirt: 2,
  emergencyName: 3, emergencyPhone: 3, emergencyRelation: 3, bloodType: 3, medicalNotes: 3, acceptRules: 3, acceptHealth: 3,
  method: 4,
};
const fail = (error: string, field?: string): RegistrationResult => ({ ok: false, error, field, step: field ? STEP_OF[field] : undefined });

export async function createRegistration(input: RegistrationInput): Promise<RegistrationResult> {
  const user = await getCurrentUser();
  if (!user) return fail("Entre na sua conta para se inscrever.");
  const limit = await hitAll([LIMITS.registrationUser, user.id], [LIMITS.registrationIp, await clientIp()]);
  if (!limit.ok) return fail(tooManyMessage(limit.retryAfterSec));

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return fail(issue.message, String(issue.path[0]));
  }
  const d = parsed.data;
  const t = today();

  // Evento e distância — tudo confirmado no servidor
  const event = await prisma.event.findUnique({
    where: { slug: d.eventSlug },
    include: { distances: { include: { tiers: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!event || event.status !== "inscricoes_abertas") return fail("As inscrições para este evento não estão abertas.");
  if (t < toDay(event.registrationOpens)) return fail("As inscrições ainda não abriram.");
  if (t > toDay(event.registrationCloses)) return fail("O prazo de inscrição já terminou.");
  const distance = event.distances.find((x) => x.code === d.distanceCode);
  if (!distance) return fail("Escolha uma distância para continuar.", "distanceCode");

  const eventDate = toDay(event.date);
  if (ageOn(d.birthDate, eventDate) < distance.minAge) {
    return fail(`Para os ${distance.name} a idade mínima é ${distance.minAge} anos no dia da prova.`, "birthDate");
  }

  const tier = distance.tiers.find((x) => toDay(x.until) >= t) ?? distance.tiers[distance.tiers.length - 1];
  if (!tier) return fail("Este evento ainda não tem preços definidos. Tente mais tarde.");

  const duplicate = await prisma.registration.findFirst({
    where: { eventId: event.id, documentNumber: d.documentNumber, status: { in: ["pagamento_pendente", "confirmada"] } },
    select: { code: true },
  });
  if (duplicate) return fail(`Já existe uma inscrição activa com este documento neste evento (${duplicate.code}). Veja "As minhas inscrições".`, "documentNumber");

  // Liberta vagas de inscrições que expiraram, antes de verificar se há lugar
  await expireStaleRegistrations({ distanceId: distance.id });

  const accounts = await paymentAccountsFor(event.id);
  const expiresAt = new Date(Date.now() + accounts.proofDeadlineHours * 3_600_000);
  const now = new Date();

  try {
    const code = await prisma.$transaction(async (tx) => {
      if (!(await takeSlot(tx, distance.id))) throw new SoldOut();
      const code = await nextRegistrationCode(tx, t.slice(0, 4));
      await tx.registration.create({
        data: {
          code,
          eventId: event.id,
          distanceId: distance.id,
          userId: user.id,
          price: tier.price,
          priceTierLabel: tier.label,
          athleteName: d.name,
          gender: d.gender,
          birthDate: new Date(`${d.birthDate}T00:00:00Z`),
          ageGroup: ageGroupFor(d.birthDate, eventDate),
          documentType: d.documentType === "Passaporte" ? "PASSAPORTE" : "BI",
          documentNumber: d.documentNumber,
          phone: toE164(d.phone),
          email: d.email || null,
          province: d.province,
          club: d.club || "Individual",
          tshirt: d.tshirt,
          emergencyName: d.emergencyName,
          emergencyPhone: toE164(d.emergencyPhone),
          emergencyRelation: d.emergencyRelation || null,
          bloodType: d.bloodType && d.bloodType !== "Não sei" ? d.bloodType : null,
          medicalNotes: d.medicalNotes || null,
          acceptedRulesAt: now,
          healthDeclarationAt: now,
          payments: {
            create: { method: d.method.replace(/-/g, "_") as "transferencia", amount: tier.price, reference: code, expiresAt },
          },
        },
      });
      return code;
    });

    // Guarda os dados no perfil para as próximas inscrições (7.3) — só se a inscrição for para o próprio
    if (!d.saveToProfile) return { ok: true, code, amount: tier.price, method: d.method, expiresAt: expiresAt.toISOString(), accounts };
    const phone = toE164(d.phone);
    const phoneTaken = await prisma.profile.findFirst({ where: { phone, id: { not: user.id } }, select: { id: true } });
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        ...(phoneTaken ? {} : { phone }),
        birthDate: new Date(`${d.birthDate}T00:00:00Z`),
        gender: d.gender,
        documentType: d.documentType === "Passaporte" ? "PASSAPORTE" : "BI",
        documentNumber: d.documentNumber,
        province: d.province,
        club: d.club || null,
        tshirt: d.tshirt,
        bloodType: d.bloodType && d.bloodType !== "Não sei" ? d.bloodType : null,
        emergencyName: d.emergencyName,
        emergencyPhone: toE164(d.emergencyPhone),
        emergencyRelation: d.emergencyRelation || null,
      },
    });

    return { ok: true, code, amount: tier.price, method: d.method, expiresAt: expiresAt.toISOString(), accounts };
  } catch (e) {
    if (e instanceof SoldOut) return fail(`Já não há vagas para os ${distance.name}. Escolha outra distância.`, "distanceCode");
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return fail("Já existe uma inscrição activa com este documento neste evento.", "documentNumber");
    }
    throw e;
  }
}

class SoldOut extends Error {}

// ───────────── Cancelar ─────────────

export async function cancelRegistration(input: { registrationId: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Entre na sua conta." };
  const reg = await prisma.registration.findUnique({
    where: { id: input.registrationId },
    select: { id: true, userId: true, status: true, distanceId: true, event: { select: { date: true } } },
  });
  if (!reg || reg.userId !== user.id) return { ok: false, error: "Inscrição não encontrada." };
  if (reg.status !== "pagamento_pendente" && reg.status !== "confirmada") return { ok: false, error: "Esta inscrição já não está activa." };
  if (toDay(reg.event.date) < today()) return { ok: false, error: "Não é possível cancelar depois da prova." };

  await prisma.$transaction(async (tx) => {
    const changed = await tx.registration.updateMany({
      where: { id: reg.id, status: { in: ["pagamento_pendente", "confirmada"] } },
      data: { status: "cancelada", cancelledAt: new Date() },
    });
    if (changed.count === 0) return;
    // Pagamentos ainda não confirmados deixam de valer; os confirmados mantêm-se (não há devolução)
    await tx.payment.updateMany({ where: { registrationId: reg.id, status: { in: ["pendente", "em_analise", "rejeitado"] } }, data: { status: "cancelado" } });
    await releaseSlot(tx, reg.distanceId);
  });
  return { ok: true };
}

// ───────────── Avisem-me quando abrir ─────────────

export async function createEventAlert(input: { eventSlug: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Entre na sua conta para receber o aviso." };
  const event = await prisma.event.findUnique({ where: { slug: input.eventSlug }, select: { id: true } });
  if (!event) return { ok: false, error: "Evento não encontrado." };
  const exists = await prisma.eventAlert.findFirst({ where: { eventId: event.id, userId: user.id, sentAt: null }, select: { id: true } });
  if (!exists) await prisma.eventAlert.create({ data: { eventId: event.id, userId: user.id, email: user.email, phone: user.phone || null } });
  return { ok: true };
}
