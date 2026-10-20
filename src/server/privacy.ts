import "server-only";
import { prisma } from "@/lib/db";
import { today } from "@/lib/today";
import { releaseSlot } from "./registrations";

/**
 * Dados pessoais — Lei n.º 22/11 (12.5). Regras aplicadas:
 * - Apagar conta (pelo próprio ou pelo admin): cancela as inscrições futuras e devolve as vagas; nas
 *   inscrições passadas apaga o documento, os contactos, a data de nascimento exacta, o contacto de
 *   emergência e os dados de saúde. Ficam o nome, o escalão e os resultados (registo histórico das
 *   provas, como diz a Política de privacidade) e os valores pagos (obrigação fiscal).
 * - Dados de saúde e contacto de emergência: só servem para o dia da prova — apagados
 *   HEALTH_RETENTION_DAYS dias depois do evento (tarefa agendada).
 */
export const HEALTH_RETENTION_DAYS = 30;

const removedHealth = { bloodType: null, medicalNotes: null, emergencyName: "", emergencyPhone: "", emergencyRelation: null };

/** Cancela as inscrições futuras de uma pessoa e anonimiza as restantes, antes de apagar a conta. */
export async function eraseRegistrationsOf(userId: string) {
  const t = new Date(`${today()}T00:00:00Z`);
  const regs = await prisma.registration.findMany({
    where: { userId },
    select: { id: true, distanceId: true, status: true, birthDate: true, event: { select: { date: true } } },
  });
  await prisma.$transaction(
    async (tx) => {
      for (const r of regs) {
        const future = r.event.date >= t;
        const active = r.status === "pagamento_pendente" || r.status === "confirmada";
        if (future && active) {
          await tx.payment.updateMany({ where: { registrationId: r.id, status: { in: ["pendente", "em_analise", "rejeitado"] } }, data: { status: "cancelado" } });
          await releaseSlot(tx, r.distanceId);
        }
        await tx.registration.update({
          where: { id: r.id },
          data: {
            ...(future && active ? { status: "cancelada", cancelledAt: new Date() } : {}),
            ...removedHealth,
            documentNumber: `removido-${r.id.slice(-10)}`,
            phone: "",
            email: null,
            birthDate: new Date(Date.UTC(r.birthDate.getUTCFullYear(), 0, 1)), // fica só o ano (escalão)
          },
        });
        await tx.payment.updateMany({ where: { registrationId: r.id }, data: { notes: null } });
      }
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
  return { cancelled: regs.filter((r) => r.event.date >= t && (r.status === "pagamento_pendente" || r.status === "confirmada")).length, anonymised: regs.length };
}

/** Apaga os dados de saúde e o contacto de emergência das inscrições de provas que terminaram há mais de 30 dias. */
export async function purgeHealthData() {
  const limit = new Date(Date.now() - HEALTH_RETENTION_DAYS * 24 * 3600 * 1000);
  const { count } = await prisma.registration.updateMany({
    where: {
      event: { date: { lt: limit } },
      OR: [{ bloodType: { not: null } }, { medicalNotes: { not: null } }, { emergencyPhone: { not: "" } }, { emergencyName: { not: "" } }],
    },
    data: removedHealth,
  });
  return count;
}

/** Tudo o que guardamos sobre uma pessoa (direito de acesso e portabilidade). */
export async function exportPersonalData(userId: string, authUser: { email?: string; created_at?: string; user_metadata?: Record<string, unknown> }) {
  const [profile, registrations, alerts, contactMessages] = await Promise.all([
    prisma.profile.findUnique({ where: { id: userId } }),
    prisma.registration.findMany({
      where: { userId },
      include: {
        event: { select: { title: true, date: true, slug: true } },
        distance: { select: { name: true } },
        payments: { select: { method: true, amount: true, status: true, transactionRef: true, createdAt: true, confirmedAt: true, reviewNote: true } },
        result: { select: { position: true, positionGender: true, positionAgeGroup: true, chipTimeMs: true, gunTimeMs: true, status: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.eventAlert.findMany({ where: { userId }, select: { createdAt: true, event: { select: { title: true } } } }),
    profileEmail(userId).then((email) => (email ? prisma.contactMessage.findMany({ where: { email: { equals: email, mode: "insensitive" } }, select: { subject: true, message: true, createdAt: true } }) : [])),
  ]);
  return {
    exportadoEm: new Date().toISOString(),
    conta: { email: authUser.email, criadaEm: authUser.created_at, consentimentos: { termosEPrivacidade: authUser.user_metadata?.terms_accepted_at ?? null } },
    perfil: profile,
    inscricoes: registrations,
    alertasDeInscricao: alerts,
    mensagensDeContacto: contactMessages,
  };
}

const profileEmail = async (id: string) => (await prisma.profile.findUnique({ where: { id }, select: { email: true } }))?.email;
