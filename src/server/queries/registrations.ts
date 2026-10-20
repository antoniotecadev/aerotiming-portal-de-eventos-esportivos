import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { mapParticipant, publicParticipantSelect } from "../mappers";

/**
 * Lista PÚBLICA de inscritos de um evento: só inscrições activas e só campos públicos
 * (dorsal, nome, sexo, escalão, distância, clube, província, estado do pagamento).
 */
export async function listPublicParticipants(eventSlug: string) {
  await connection();
  const rows = await prisma.registration.findMany({
    where: { event: { slug: eventSlug }, status: { in: ["pagamento_pendente", "confirmada"] } },
    select: publicParticipantSelect,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(mapParticipant);
}
