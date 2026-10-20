"use server";

import { prisma } from "@/lib/db";
import { getCurrentUser } from "../auth";
import { canManageEvent } from "../permissions";
import { checkResultsCsv, recomputeRankings, type ImportCheck } from "../results";
import { msToHms } from "../mappers";

type Input = { eventSlug: string; distanceCode: string; csv: string };
type Fail = { ok: false; error: string };

export interface ImportPreview {
  total: number;
  finishers: number;
  linked: number;
  replacing: number;
  errors: string[];
  warnings: string[];
  /** Primeiras linhas, para conferir as colunas. */
  sample: { line: number; bib: string; name: string; gender: string; ageGroup: string; time: string | null; status: string; linked: boolean }[];
}

/** Evento + distância que o utilizador pode gerir (admin ou organizador do evento). */
async function loadDistance(eventSlug: string, distanceCode: string) {
  const user = await getCurrentUser();
  const dist = await prisma.eventDistance.findFirst({ where: { code: distanceCode, event: { slug: eventSlug } }, select: { id: true, eventId: true, name: true } });
  if (!dist) return { error: "Evento ou distância não encontrados." } as const;
  if (!(await canManageEvent(user, dist.eventId))) return { error: "Não tem permissão para os resultados deste evento." } as const;
  return { user: user!, dist } as const;
}

const toPreview = (c: ImportCheck): ImportPreview => ({
  total: c.rows.length,
  finishers: c.rows.filter((r) => r.status === "terminou").length,
  linked: c.rows.filter((r) => r.registrationId).length,
  replacing: c.replacing,
  errors: c.errors,
  warnings: c.warnings,
  sample: c.rows.slice(0, 8).map((r) => ({
    line: r.line,
    bib: r.bib,
    name: r.name,
    gender: r.gender,
    ageGroup: r.ageGroup,
    time: msToHms(r.chipTimeMs ?? r.gunTimeMs ?? null),
    status: r.status!,
    linked: !!r.registrationId,
  })),
});

/** 10.1 — passo 1: valida o ficheiro no servidor e mostra o que vai ser gravado (não grava nada). */
export async function previewResultsImport(input: Input): Promise<{ ok: true; preview: ImportPreview } | Fail> {
  const loaded = await loadDistance(input.eventSlug, input.distanceCode);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const check = await checkResultsCsv(loaded.dist.eventId, loaded.dist.id, input.csv);
  if ("error" in check) return { ok: false, error: check.error };
  return { ok: true, preview: toPreview(check) };
}

/**
 * 10.1 — passo 2 (após confirmação): volta a validar o mesmo ficheiro, substitui os resultados da
 * distância, liga-os às inscrições pelo dorsal e recalcula as classificações — tudo numa transacção.
 */
export async function importResults(input: Input): Promise<{ ok: true; message: string } | Fail> {
  const loaded = await loadDistance(input.eventSlug, input.distanceCode);
  if ("error" in loaded) return { ok: false, error: loaded.error! };
  const { user, dist } = loaded;
  const check = await checkResultsCsv(dist.eventId, dist.id, input.csv);
  if ("error" in check) return { ok: false, error: check.error };
  if (!check.rows.length) return { ok: false, error: "Nenhuma linha válida para importar." };

  const data = check.rows.map(({ line: _line, otherDistance: _other, ...r }) => r);
  await prisma.$transaction(
    async (tx) => {
      // Liberta as inscrições que vão ser ligadas a estas linhas (registration_id é único)
      await tx.result.deleteMany({ where: { distanceId: dist.id } });
      await tx.result.createMany({ data });
      await recomputeRankings(tx, dist.id);
      await tx.auditLog.create({
        data: { actorId: user.id, action: "results.import", entity: "event", entityId: dist.eventId, data: { distance: dist.name, rows: data.length, replaced: check.replacing, skipped: check.errors.length } },
      });
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
  const skipped = check.errors.length ? ` ${check.errors.length} linha(s) com erros ficaram de fora.` : "";
  return { ok: true, message: `${data.length} resultados importados em ${dist.name}; classificações calculadas.${skipped}` };
}
