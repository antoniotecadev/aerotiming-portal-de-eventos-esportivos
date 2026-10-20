import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { PaymentAccounts, User } from "@/lib/types";
import { toDay } from "../mappers";

/** Eventos cujos pagamentos o utilizador pode gerir (admin: todos; organizador: os seus). */
export async function listManagedEvents(user: User) {
  await connection();
  const rows = await prisma.event.findMany({
    where: {
      status: { not: "rascunho" },
      ...(user.role === "admin" ? {} : { staff: { some: { profileId: user.id, role: "organizador" } } }),
    },
    select: { id: true, title: true, date: true, paymentAccounts: true },
    orderBy: { date: "desc" },
  });
  return rows.map((e) => ({ id: e.id, title: e.title, date: toDay(e.date), hasOwnAccounts: e.paymentAccounts !== null, accounts: e.paymentAccounts as unknown as PaymentAccounts | null }));
}

export type PanelTab = "por-confirmar" | "rejeitados" | "confirmados" | "todos";

const STATUS_BY_TAB: Record<PanelTab, Prisma.PaymentWhereInput["status"]> = {
  "por-confirmar": { in: ["pendente", "em_analise"] },
  rejeitados: "rejeitado",
  confirmados: "confirmado",
  todos: undefined,
};

/** Pagamentos para o painel, com filtros. Limitado a 300 por pedido (paginação: tarefa 5.10). */
export async function listPanelPayments(opts: { eventIds: string[]; tab: PanelTab; q?: string }) {
  await connection();
  const q = opts.q?.trim();
  const base: Prisma.PaymentWhereInput = {
    registration: {
      eventId: { in: opts.eventIds },
      ...(q
        ? { OR: [{ code: { contains: q, mode: "insensitive" } }, { athleteName: { contains: q, mode: "insensitive" } }, { phone: { contains: q.replace(/\D/g, "") || q } }, { bib: q }] }
        : {}),
    },
  };
  const [rows, grouped] = await Promise.all([
    prisma.payment.findMany({
      where: { ...base, status: STATUS_BY_TAB[opts.tab] },
      include: {
        registration: {
          select: {
            id: true, code: true, status: true, athleteName: true, phone: true, bib: true,
            distance: { select: { name: true } },
            event: { select: { id: true, title: true } },
          },
        },
      },
      // Os mais antigos primeiro na fila "por confirmar"; os mais recentes nas outras
      orderBy: { createdAt: opts.tab === "por-confirmar" ? "asc" : "desc" },
      take: 300,
    }),
    prisma.payment.groupBy({ by: ["status"], where: base, _count: true }),
  ]);
  const count = (s: string[]) => grouped.filter((g) => s.includes(g.status)).reduce((a, g) => a + g._count, 0);
  return {
    rows: rows.map((p) => ({
      id: p.id,
      status: p.status,
      method: p.method,
      amount: p.amount,
      transactionRef: p.transactionRef,
      reviewNote: p.reviewNote,
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiresAt?.toISOString() ?? null,
      confirmedAt: p.confirmedAt?.toISOString() ?? null,
      proofReceivedAt: p.proofUploadedAt?.toISOString() ?? null,
      code: p.registration.code,
      registrationStatus: p.registration.status,
      athleteName: p.registration.athleteName,
      phone: p.registration.phone,
      bib: p.registration.bib,
      distanceName: p.registration.distance.name,
      eventId: p.registration.event.id,
      eventTitle: p.registration.event.title,
    })),
    counts: {
      "por-confirmar": count(["pendente", "em_analise"]),
      rejeitados: count(["rejeitado"]),
      confirmados: count(["confirmado"]),
      todos: count(["pendente", "em_analise", "rejeitado", "confirmado", "expirado", "cancelado", "reembolsado"]),
    } satisfies Record<PanelTab, number>,
  };
}

export type PanelPayment = Awaited<ReturnType<typeof listPanelPayments>>["rows"][number];

export async function getSitePaymentAccounts() {
  await connection();
  const s = await prisma.siteSetting.findUnique({ where: { key: "payment_accounts" } });
  return (s?.value as unknown as PaymentAccounts | undefined) ?? { iban: [], proofDeadlineHours: 72 };
}
