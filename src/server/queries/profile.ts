import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { today } from "@/lib/today";
import type { PaymentMethod, PaymentState, RegistrationStatus, RegistrationWithEvent, ResultWithEvent } from "@/lib/types";
import { eventDetailInclude, eventListInclude, mapEvent, mapResult, resultInclude } from "../mappers";
import { paymentAccountsFor } from "../registrations";

/** Inscrições do utilizador (só as dele), com o último pagamento e as contas para pagar. */
export const listMyRegistrations = cache(async (userId: string): Promise<RegistrationWithEvent[]> => {
  const t = today();
  const rows = await prisma.registration.findMany({
    where: { userId },
    include: {
      event: { include: eventDetailInclude },
      distance: { select: { code: true } },
      payments: { orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { event: { date: "asc" } },
  });

  const accountsByEvent = new Map<string, Awaited<ReturnType<typeof paymentAccountsFor>>>();
  for (const r of rows) {
    if (r.status === "pagamento_pendente" && !accountsByEvent.has(r.eventId)) accountsByEvent.set(r.eventId, await paymentAccountsFor(r.eventId));
  }

  return rows.map((r) => {
    const event = mapEvent(r.event, t);
    const pay = r.payments[0];
    return {
      id: r.id,
      code: r.code,
      userId,
      userName: r.athleteName,
      eventSlug: event.slug,
      distanceId: r.distance.code,
      bib: r.bib ?? "",
      status: r.status.replace(/_/g, "-") as RegistrationStatus,
      tshirt: r.tshirt,
      payment: {
        method: (pay?.method.replace(/_/g, "-") ?? "transferencia") as PaymentMethod,
        state: (pay?.status.replace(/_/g, "-") ?? "pendente") as PaymentState,
        amount: pay?.amount ?? r.price,
        reference: pay?.reference ?? r.code,
        expiresAt: pay?.expiresAt?.toISOString(),
        confirmedAt: pay?.confirmedAt?.toISOString(),
        reviewNote: pay?.reviewNote ?? undefined,
      },
      kitStatus: r.kitStatus === "levantado" ? "levantado" : "por-levantar",
      createdAt: r.createdAt.toISOString(),
      event,
      distance: event.distances.find((d) => d.id === r.distance.code),
      accounts: accountsByEvent.get(r.eventId),
    };
  });
});

/** Resultados ligados às inscrições do utilizador (publicados). */
export const listMyResults = cache(async (userId: string): Promise<ResultWithEvent[]> => {
  const t = today();
  const rows = await prisma.result.findMany({
    where: { registration: { userId }, event: { resultsPublished: true } },
    include: { ...resultInclude, event: { include: eventListInclude } },
    orderBy: { event: { date: "desc" } },
  });
  return rows.map((r) => {
    const event = mapEvent(r.event, t);
    return { ...mapResult({ ...r, event: { slug: r.event.slug } }), event, distance: event.distances.find((d) => d.id === r.distance.code) };
  });
});

