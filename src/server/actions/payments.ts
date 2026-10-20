"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { PaymentAccounts } from "@/lib/types";
import { getCurrentUser, hasRole } from "../auth";
import { canManageEvent } from "../permissions";
import { assignBib, paymentAccountsFor, takeSlot } from "../registrations";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; duplicateOf?: string };

/** Carrega o pagamento e confirma que quem pede gere o evento (admin ou organizador do evento). */
async function loadForManager(paymentId: string) {
  const user = await getCurrentUser();
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { registration: { select: { id: true, code: true, status: true, eventId: true, distanceId: true } } },
  });
  if (!payment) return { error: "Pagamento não encontrado." } as const;
  if (!(await canManageEvent(user, payment.registration.eventId))) return { error: "Não tem permissão para gerir os pagamentos deste evento." } as const;
  return { user: user!, payment } as const;
}

const audit = (tx: Prisma.TransactionClient, actorId: string, action: string, paymentId: string, data: Prisma.InputJsonValue) =>
  tx.auditLog.create({ data: { actorId, action, entity: "payment", entityId: paymentId, data } });

// ───────────── Confirmar ─────────────

/**
 * Confirma que o dinheiro foi recebido (D10: admin ou organizador do evento):
 * pagamento `confirmado` → inscrição `confirmada` → dorsal atribuído → auditoria.
 * Seguro com dois cliques/duas pessoas ao mesmo tempo (update condicional).
 */
export async function confirmPayment(input: { paymentId: string; transactionRef?: string; note?: string; force?: boolean }): Promise<Result<{ bib: string }>> {
  const loaded = await loadForManager(input.paymentId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { user, payment } = loaded;
  const ref = input.transactionRef?.trim().toUpperCase() || null;

  // Comprovativo repetido? (o mesmo nº de operação já usado noutro pagamento)
  if (ref && !input.force) {
    const dup = await prisma.payment.findFirst({
      where: { transactionRef: ref, id: { not: payment.id }, status: "confirmado" },
      select: { registration: { select: { code: true } } },
    });
    if (dup) return { ok: false, error: `Este nº de operação já foi usado para confirmar a inscrição ${dup.registration.code}.`, duplicateOf: dup.registration.code };
  }

  const regStatus = payment.registration.status;
  if (regStatus === "cancelada") return { ok: false, error: "Esta inscrição foi cancelada. Não é possível confirmar o pagamento." };

  try {
    const bib = await prisma.$transaction(async (tx) => {
      const changed = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ["pendente", "em_analise", "rejeitado", "expirado"] } },
        data: { status: "confirmado", confirmedAt: new Date(), confirmedById: user.id, transactionRef: ref, reviewNote: input.note?.trim() || null },
      });
      if (changed.count === 0) throw new Error("ALREADY");
      // Pagou depois do prazo: volta a ocupar a vaga, se ainda houver
      if (regStatus === "expirada" && !(await takeSlot(tx, payment.registration.distanceId))) throw new Error("SOLD_OUT");
      await tx.registration.update({ where: { id: payment.registration.id }, data: { status: "confirmada" } });
      const bib = await assignBib(tx, payment.registration.id);
      await audit(tx, user.id, "payment.confirm", payment.id, { code: payment.registration.code, bib, transactionRef: ref });
      return bib;
    });
    return { ok: true, bib };
  } catch (e) {
    if (e instanceof Error && e.message === "ALREADY") return { ok: false, error: "Este pagamento já foi confirmado (talvez por outra pessoa)." };
    if (e instanceof Error && e.message === "SOLD_OUT") return { ok: false, error: "A inscrição tinha expirado e já não há vagas nesta distância." };
    throw e;
  }
}

// ───────────── Comprovativo recebido (WhatsApp) ─────────────

/** O organizador recebeu o comprovativo pelo WhatsApp e vai verificar: a inscrição deixa de expirar. */
export async function markProofReceived(input: { paymentId: string }): Promise<Result> {
  const loaded = await loadForManager(input.paymentId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { user, payment } = loaded;
  await prisma.$transaction(async (tx) => {
    const changed = await tx.payment.updateMany({ where: { id: payment.id, status: { in: ["pendente", "rejeitado"] } }, data: { status: "em_analise", proofUploadedAt: new Date() } });
    if (changed.count) await audit(tx, user.id, "payment.proof_received", payment.id, { code: payment.registration.code });
  });
  return { ok: true };
}

// ───────────── Rejeitar ─────────────

export async function rejectPayment(input: { paymentId: string; reason: string }): Promise<Result> {
  const reason = input.reason?.trim();
  if (!reason || reason.length < 5) return { ok: false, error: "Escreva o motivo (o atleta vai vê-lo no perfil)." };
  const loaded = await loadForManager(input.paymentId);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { user, payment } = loaded;
  const hours = (await paymentAccountsFor(payment.registration.eventId)).proofDeadlineHours;
  await prisma.$transaction(async (tx) => {
    const changed = await tx.payment.updateMany({
      where: { id: payment.id, status: { in: ["pendente", "em_analise"] } },
      // Dá novo prazo para pagar/enviar outra vez; depois expira normalmente
      data: { status: "rejeitado", reviewNote: reason, expiresAt: new Date(Date.now() + hours * 3_600_000) },
    });
    if (changed.count) await audit(tx, user.id, "payment.reject", payment.id, { code: payment.registration.code, reason });
  });
  return { ok: true };
}

// ───────────── Exportar CSV ─────────────

export async function exportPaymentsCsv(input: { eventId: string }): Promise<Result<{ csv: string; filename: string }>> {
  const user = await getCurrentUser();
  if (!(await canManageEvent(user, input.eventId))) return { ok: false, error: "Sem permissão." };
  const event = await prisma.event.findUnique({ where: { id: input.eventId }, select: { slug: true } });
  const rows = await prisma.payment.findMany({
    where: { registration: { eventId: input.eventId } },
    include: { registration: { select: { code: true, athleteName: true, phone: true, bib: true, distance: { select: { name: true } } } } },
    orderBy: { createdAt: "asc" },
  });
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Código", "Atleta", "Telemóvel", "Distância", "Dorsal", "Método", "Valor (Kz)", "Estado", "Nº operação", "Confirmado em", "Nota"];
  const lines = rows.map((p) =>
    [p.registration.code, p.registration.athleteName, p.registration.phone, p.registration.distance.name, p.registration.bib, p.method, p.amount, p.status, p.transactionRef, p.confirmedAt?.toISOString().slice(0, 16).replace("T", " "), p.reviewNote]
      .map(esc)
      .join(";"),
  );
  // BOM + ";" para abrir directamente no Excel em português
  return { ok: true, csv: `﻿${header.map(esc).join(";")}\n${lines.join("\n")}`, filename: `pagamentos-${event?.slug ?? input.eventId}.csv` };
}

// ───────────── Contas de recebimento ─────────────

const digits = (v: string) => v.replace(/\D/g, "");
const accountsSchema = z.object({
  whatsapp: z.string().trim().refine((v) => !v || /^(244)?9\d{8}$/.test(digits(v)), { message: "WhatsApp: 9 dígitos, a começar por 9." }),
  expressPhone: z.string().trim().refine((v) => !v || /^(244)?9\d{8}$/.test(digits(v)), { message: "Multicaixa Express: 9 dígitos, a começar por 9." }),
  expressHolder: z.string().trim().max(80),
  kwikId: z.string().trim().max(40),
  kwikHolder: z.string().trim().max(80),
  iban: z.array(z.object({ bank: z.string().trim().max(60), holder: z.string().trim().max(80), iban: z.string().trim().max(40) })).max(3),
  depositInstructions: z.string().trim().max(300),
  proofDeadlineHours: z.coerce.number().int().min(12, { message: "Prazo mínimo: 12 horas." }).max(240, { message: "Prazo máximo: 240 horas (10 dias)." }),
});
export type PaymentAccountsInput = z.input<typeof accountsSchema>;

/** Grava as contas da ConexãoSport (eventId = null, só admin) ou as de um evento (admin ou organizador). */
export async function savePaymentAccounts(input: { eventId: string | null; accounts: PaymentAccountsInput }): Promise<Result> {
  const user = await getCurrentUser();
  if (input.eventId ? !(await canManageEvent(user, input.eventId)) : !hasRole(user, "admin")) return { ok: false, error: "Sem permissão." };
  const parsed = accountsSchema.safeParse(input.accounts);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const a = parsed.data;
  const withCountry = (v: string) => (v ? (digits(v).startsWith("244") ? digits(v) : `244${digits(v)}`) : undefined);
  const value: PaymentAccounts = {
    iban: a.iban.filter((i) => i.iban),
    multicaixaExpress: a.expressPhone ? { phone: `+${withCountry(a.expressPhone)}`, holder: a.expressHolder } : undefined,
    kwik: a.kwikId ? { id: a.kwikId, holder: a.kwikHolder } : undefined,
    depositInstructions: a.depositInstructions || undefined,
    whatsapp: withCountry(a.whatsapp),
    proofDeadlineHours: a.proofDeadlineHours,
  };
  const json = JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue; // retira campos undefined
  if (input.eventId) await prisma.event.update({ where: { id: input.eventId }, data: { paymentAccounts: json } });
  else await prisma.siteSetting.upsert({ where: { key: "payment_accounts" }, create: { key: "payment_accounts", value: json }, update: { value: json } });
  await prisma.auditLog.create({ data: { actorId: user!.id, action: "payment_accounts.update", entity: input.eventId ? "event" : "site", entityId: input.eventId ?? "payment_accounts" } });
  return { ok: true };
}

/** Volta a usar as contas da ConexãoSport num evento. */
export async function clearEventPaymentAccounts(input: { eventId: string }): Promise<Result> {
  const user = await getCurrentUser();
  if (!(await canManageEvent(user, input.eventId))) return { ok: false, error: "Sem permissão." };
  await prisma.event.update({ where: { id: input.eventId }, data: { paymentAccounts: Prisma.DbNull } });
  return { ok: true };
}
