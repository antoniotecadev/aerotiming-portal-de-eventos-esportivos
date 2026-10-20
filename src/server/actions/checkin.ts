"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "../auth";
import { canCheckIn } from "../permissions";

export interface CheckInRecord {
  id: string;
  code: string;
  bib: string | null;
  athleteName: string;
  documentType: string;
  documentNumber: string;
  distanceName: string;
  tshirt: string;
  status: "pagamento_pendente" | "confirmada" | "cancelada" | "expirada";
  paymentStatus: string | null;
  kitStatus: "por_levantar" | "levantado";
  kitPickedUpAt: string | null;
}

type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

/** Procura uma inscrição do evento pelo código (QR do bilhete) ou pelo dorsal. */
export async function findForCheckIn(input: { eventId: string; query: string }): Promise<Result<{ record: CheckInRecord }>> {
  const user = await getCurrentUser();
  if (!(await canCheckIn(user, input.eventId))) return { ok: false, error: "Não tem permissão para fazer check-in neste evento." };
  const q = input.query.trim().toUpperCase();
  if (!q) return { ok: false, error: "Escreva o código da inscrição ou o dorsal." };

  const reg = await prisma.registration.findFirst({
    where: { eventId: input.eventId, OR: [{ code: q }, { bib: q }] },
    include: { distance: { select: { name: true } }, payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } } },
  });
  if (!reg) return { ok: false, error: `Nenhuma inscrição com "${q}" neste evento.` };
  return {
    ok: true,
    record: {
      id: reg.id,
      code: reg.code,
      bib: reg.bib,
      athleteName: reg.athleteName,
      documentType: reg.documentType === "PASSAPORTE" ? "Passaporte" : "BI",
      documentNumber: reg.documentNumber,
      distanceName: reg.distance.name,
      tshirt: reg.tshirt,
      status: reg.status,
      paymentStatus: reg.payments[0]?.status ?? null,
      kitStatus: reg.kitStatus,
      kitPickedUpAt: reg.kitPickedUpAt?.toISOString() ?? null,
    },
  };
}

/** Marca o kit como entregue. Só para inscrições confirmadas (pagamento confirmado). */
export async function markKitPickedUp(input: { registrationId: string }): Promise<Result<object>> {
  const user = await getCurrentUser();
  const reg = await prisma.registration.findUnique({ where: { id: input.registrationId }, select: { id: true, eventId: true, status: true, kitStatus: true, code: true } });
  if (!reg) return { ok: false, error: "Inscrição não encontrada." };
  if (!(await canCheckIn(user, reg.eventId))) return { ok: false, error: "Não tem permissão para fazer check-in neste evento." };
  if (reg.status !== "confirmada") return { ok: false, error: "O pagamento desta inscrição ainda não foi confirmado. Não entregue o kit." };
  if (reg.kitStatus === "levantado") return { ok: false, error: "Este kit já foi entregue." };

  await prisma.$transaction([
    prisma.registration.update({ where: { id: reg.id }, data: { kitStatus: "levantado", kitPickedUpAt: new Date(), kitPickedUpById: user!.id } }),
    prisma.auditLog.create({ data: { actorId: user!.id, action: "kit.pickup", entity: "registration", entityId: reg.id, data: { code: reg.code } } }),
  ]);
  return { ok: true };
}
