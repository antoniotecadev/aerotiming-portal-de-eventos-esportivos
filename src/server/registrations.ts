import "server-only";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentAccounts } from "@/lib/types";

type Tx = Prisma.TransactionClient;

/** Escalão etário no dia da prova (tabela actual — D8). */
export function ageGroupFor(birthDate: string, eventDate: string) {
  const age = ageOn(birthDate, eventDate);
  if (age < 20) return "Júnior";
  if (age < 35) return "Sénior";
  if (age < 45) return "Veterano 35";
  if (age < 55) return "Veterano 45";
  return "Veterano 55+";
}

export function ageOn(birthDate: string, onDate: string) {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [y, m, d] = onDate.split("-").map(Number);
  return y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
}

/** Ocupa uma vaga de forma atómica. Devolve false se a distância já estiver cheia. */
export async function takeSlot(tx: Tx, distanceId: string) {
  const n = await tx.$executeRaw`
    UPDATE event_distances SET slots_taken = slots_taken + 1
    WHERE id = ${distanceId} AND slots_taken < total_slots`;
  return n === 1;
}

/** Devolve uma vaga (cancelamento ou expiração). */
export function releaseSlot(tx: Tx, distanceId: string) {
  return tx.$executeRaw`UPDATE event_distances SET slots_taken = GREATEST(slots_taken - 1, 0) WHERE id = ${distanceId}`;
}

/** Próximo código de inscrição do ano, sem repetições: CS-2026-00001. */
export async function nextRegistrationCode(tx: Tx, year: string) {
  const key = `registration:${year}`;
  const [row] = await tx.$queryRaw<{ value: number }[]>`
    INSERT INTO counters (key, value) VALUES (${key}, 1)
    ON CONFLICT (key) DO UPDATE SET value = counters.value + 1
    RETURNING value`;
  return `CS-${year}-${String(row.value).padStart(5, "0")}`;
}

/**
 * Atribui o dorsal quando o pagamento é confirmado (tarefa 7.2). Usa a sequência da distância
 * (next_bib) e salta números já ocupados. Chamar dentro da transacção de confirmação (Fase 8).
 */
export async function assignBib(tx: Tx, registrationId: string) {
  const reg = await tx.registration.findUniqueOrThrow({ where: { id: registrationId }, select: { bib: true, eventId: true, distanceId: true } });
  if (reg.bib) return reg.bib;
  for (let attempt = 0; attempt < 50; attempt++) {
    const [row] = await tx.$queryRaw<{ bib: number }[]>`
      UPDATE event_distances SET next_bib = next_bib + 1 WHERE id = ${reg.distanceId} RETURNING next_bib - 1 AS bib`;
    const bib = String(row.bib);
    const taken = await tx.registration.findFirst({ where: { eventId: reg.eventId, bib }, select: { id: true } });
    if (!taken) {
      await tx.registration.update({ where: { id: registrationId }, data: { bib } });
      return bib;
    }
  }
  throw new Error("Não foi possível atribuir um dorsal livre.");
}

/**
 * Expira as inscrições não pagas depois do prazo (tarefa 7.7): pagamento `pendente` ou `rejeitado`
 * com `expires_at` no passado → pagamento `expirado`, inscrição `expirada`, vaga devolvida.
 * Nunca toca em pagamentos `em_analise` (o organizador já recebeu o comprovativo pelo WhatsApp).
 */
export async function expireStaleRegistrations(filter: { distanceId?: string } = {}) {
  const stale = await prisma.payment.findMany({
    where: {
      status: { in: ["pendente", "rejeitado"] },
      expiresAt: { lt: new Date() },
      registration: { status: "pagamento_pendente", ...(filter.distanceId ? { distanceId: filter.distanceId } : {}) },
    },
    select: { id: true, registrationId: true, registration: { select: { distanceId: true } } },
    take: 500,
  });
  for (const p of stale) {
    await prisma.$transaction(async (tx) => {
      const changed = await tx.registration.updateMany({ where: { id: p.registrationId, status: "pagamento_pendente" }, data: { status: "expirada" } });
      if (changed.count === 0) return; // outra pessoa já tratou desta inscrição
      await tx.payment.update({ where: { id: p.id }, data: { status: "expirado" } });
      await releaseSlot(tx, p.registration.distanceId);
    });
  }
  return stale.length;
}

/** Contas de recebimento do evento ou, se não tiver, as da ConexãoSport (D9). */
export async function paymentAccountsFor(eventId: string): Promise<PaymentAccounts> {
  const [event, setting] = await Promise.all([
    prisma.event.findUnique({ where: { id: eventId }, select: { paymentAccounts: true } }),
    prisma.siteSetting.findUnique({ where: { key: "payment_accounts" } }),
  ]);
  const fallback: PaymentAccounts = { iban: [], proofDeadlineHours: 72 };
  const site = (setting?.value as unknown as PaymentAccounts | undefined) ?? fallback;
  const own = event?.paymentAccounts as unknown as Partial<PaymentAccounts> | null;
  return own ? { ...site, ...own, proofDeadlineHours: own.proofDeadlineHours ?? site.proofDeadlineHours } : site;
}
