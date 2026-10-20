import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { mapResult, msToHms, resultInclude } from "../mappers";

/** Resultados de uma prova (só se estiverem publicados). */
export async function listResults(eventSlug: string) {
  await connection();
  const rows = await prisma.result.findMany({
    where: { event: { slug: eventSlug, resultsPublished: true } },
    include: resultInclude,
    orderBy: [{ distance: { sortOrder: "asc" } }, { position: { sort: "asc", nulls: "last" } }],
  });
  return rows.map(mapResult);
}

/**
 * Índice leve para "Procurar o meu resultado" (todas as provas publicadas).
 * ⚠️ Envia todos os resultados para o browser — trocar por pesquisa no servidor
 * quando o volume crescer (GUIA_MIGRACAO.md, tarefa 5.10).
 */
export async function listResultIndex() {
  await connection();
  const rows = await prisma.result.findMany({
    where: { event: { resultsPublished: true } },
    select: {
      name: true,
      bib: true,
      chipTimeMs: true,
      position: true,
      event: { select: { slug: true, title: true } },
      distance: { select: { code: true, name: true } },
    },
  });
  return rows.map((r) => ({
    name: r.name,
    bib: r.bib,
    eventSlug: r.event.slug,
    eventTitle: r.event.title,
    distanceId: r.distance.code,
    distanceName: r.distance.name,
    chipTime: msToHms(r.chipTimeMs),
    position: r.position,
  }));
}
