import "server-only";
import type { Gender, Prisma, ResultStatus } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";

/**
 * Resultados (Fase 10): leitura do CSV da cronometragem e classificações, sempre no servidor.
 * Gravar e recalcular são feitos pelas actions em src/server/actions/results.ts e admin.ts.
 */

// ───────────── Tempos ─────────────

/** "1:02:03", "02:03", "1:02:03.4" → milissegundos (null se vazio ou inválido). */
export function parseTimeMs(raw: string): number | null | undefined {
  const t = raw.trim();
  if (!t) return null;
  const m = /^(?:(\d{1,2}):)?(\d{1,2}):(\d{2})(?:[.,](\d{1,3}))?$/.exec(t);
  if (!m) return undefined; // inválido
  const [, h = "0", min, s, frac = "0"] = m;
  if (Number(min) > 59 || Number(s) > 59) return undefined;
  return ((Number(h) * 60 + Number(min)) * 60 + Number(s)) * 1000 + Number(frac.padEnd(3, "0"));
}

// ───────────── CSV ─────────────

/** Lê CSV separado por vírgulas ou ponto e vírgula (detectado pela 1.ª linha), com aspas. */
export function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[\s_.-]/g, "");

/** Nomes aceites para cada coluna (inglês do modelo + português). */
const COLUMNS = {
  bib: ["bib", "dorsal", "numero", "num"],
  name: ["name", "nome", "atleta"],
  gender: ["gender", "sexo", "genero"],
  ageGroup: ["agegroup", "escalao", "categoria"],
  club: ["club", "clube", "equipa"],
  nationality: ["nationality", "nacionalidade", "pais"],
  chipTime: ["chiptime", "tempochip", "chip", "tempoliquido"],
  gunTime: ["guntime", "tempooficial", "oficial", "tempobruto", "tempo"],
  status: ["status", "estado"],
} as const;
type Column = keyof typeof COLUMNS;

const STATUS_ALIASES: Record<string, ResultStatus> = {
  terminou: "terminou",
  finished: "terminou",
  ok: "terminou",
  fin: "terminou",
  desistiu: "desistiu",
  dnf: "desistiu",
  desclassificado: "desclassificado",
  dsq: "desclassificado",
  dq: "desclassificado",
  naopartiu: "nao_partiu",
  dns: "nao_partiu",
};

function parseGender(raw: string): Gender | null {
  const g = norm(raw);
  if (!g) return null;
  if (["f", "fem", "feminino", "w", "female", "mulher"].includes(g)) return "F";
  if (["m", "masc", "masculino", "male", "homem"].includes(g)) return "M";
  return null;
}

export const MAX_IMPORT_ROWS = 5000;

export type ImportRow = Omit<Prisma.ResultCreateManyInput, "id" | "createdAt" | "updatedAt" | "splits"> & {
  line: number;
  /** A inscrição existe noutra distância (o atleta trocou no dia da prova?). */
  otherDistance?: string;
};

export interface ImportCheck {
  rows: ImportRow[];
  /** Linhas recusadas (não são gravadas). */
  errors: string[];
  /** Linhas gravadas, mas a rever. */
  warnings: string[];
  /** Quantos resultados existem hoje nesta distância (serão substituídos). */
  replacing: number;
}

/**
 * Valida o CSV de uma distância contra a BD: colunas, tempos, dorsais repetidos ou já usados noutra
 * distância, e liga cada linha à inscrição pelo dorsal (preenche nome/sexo/escalão/clube em falta).
 */
export async function checkResultsCsv(eventId: string, distanceId: string, csv: string): Promise<ImportCheck | { error: string }> {
  const table = parseCsv(csv);
  if (table.length < 2) return { error: "O ficheiro não tem linhas de dados." };
  if (table.length - 1 > MAX_IMPORT_ROWS) return { error: `O ficheiro tem mais de ${MAX_IMPORT_ROWS} linhas. Divida-o por distância.` };

  const header = table[0].map(norm);
  const idx = Object.fromEntries(
    (Object.keys(COLUMNS) as Column[]).map((k) => [k, header.findIndex((h) => (COLUMNS[k] as readonly string[]).includes(h))]),
  ) as Record<Column, number>;
  if (idx.bib < 0) return { error: "Falta a coluna do dorsal (bib ou dorsal). Descarregue o modelo CSV para ver as colunas." };
  if (idx.chipTime < 0 && idx.gunTime < 0 && idx.status < 0)
    return { error: "Faltam as colunas dos tempos (chipTime / gunTime) ou do estado. Descarregue o modelo CSV para ver as colunas." };

  const [registrations, elsewhere, replacing, distances] = await Promise.all([
    prisma.registration.findMany({
      where: { eventId, bib: { not: null }, status: { notIn: ["cancelada", "expirada"] } },
      select: { id: true, bib: true, distanceId: true, athleteName: true, gender: true, ageGroup: true, club: true, nationality: true },
    }),
    // Dorsais com resultado noutra distância do mesmo evento (o dorsal é único por evento)
    prisma.result.findMany({ where: { eventId, distanceId: { not: distanceId } }, select: { bib: true, registrationId: true, distance: { select: { name: true } } } }),
    prisma.result.count({ where: { distanceId } }),
    prisma.eventDistance.findMany({ where: { eventId }, select: { id: true, name: true } }),
  ]);
  const regByBib = new Map(registrations.map((r) => [r.bib!, r]));
  const takenBib = new Map(elsewhere.map((r) => [r.bib, r.distance.name]));
  const linkedElsewhere = new Set(elsewhere.map((r) => r.registrationId).filter(Boolean));
  const distName = new Map(distances.map((d) => [d.id, d.name]));

  const rows: ImportRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();
  let unlinked = 0;

  table.slice(1).forEach((cells, i) => {
    const line = i + 2;
    const get = (k: Column) => (idx[k] >= 0 ? (cells[idx[k]] ?? "").trim() : "");
    const bib = get("bib").replace(/^#/, "");
    if (!bib) return errors.push(`Linha ${line}: falta o dorsal.`);
    if (seen.has(bib)) return errors.push(`Linha ${line}: dorsal ${bib} repetido no ficheiro.`);
    seen.add(bib);
    if (takenBib.has(bib)) return errors.push(`Linha ${line}: o dorsal ${bib} já tem resultado em ${takenBib.get(bib)}.`);

    const reg = regByBib.get(bib);
    const name = get("name") || reg?.athleteName || "";
    if (!name) return errors.push(`Linha ${line}: dorsal ${bib} sem nome e sem inscrição com este dorsal.`);
    const genderRaw = get("gender");
    const gender = parseGender(genderRaw) ?? (genderRaw ? null : (reg?.gender ?? null));
    if (!gender) return errors.push(`Linha ${line}: sexo ${genderRaw ? `“${genderRaw}” inválido` : "em falta"} (use M ou F).`);

    const chipRaw = get("chipTime");
    const gunRaw = get("gunTime");
    const chipTimeMs = parseTimeMs(chipRaw);
    const gunTimeMs = parseTimeMs(gunRaw);
    if (chipTimeMs === undefined) return errors.push(`Linha ${line}: tempo de chip inválido (“${chipRaw}”). Use HH:MM:SS.`);
    if (gunTimeMs === undefined) return errors.push(`Linha ${line}: tempo oficial inválido (“${gunRaw}”). Use HH:MM:SS.`);

    const statusRaw = norm(get("status"));
    if (statusRaw && !STATUS_ALIASES[statusRaw]) return errors.push(`Linha ${line}: estado “${get("status")}” desconhecido (terminou, desistiu, desclassificado, nao-partiu).`);
    const status: ResultStatus = STATUS_ALIASES[statusRaw] ?? (chipTimeMs !== null || gunTimeMs !== null ? "terminou" : "nao_partiu");
    if (status === "terminou" && chipTimeMs === null && gunTimeMs === null) return errors.push(`Linha ${line}: dorsal ${bib} terminou mas não tem tempo.`);

    const link = reg && !linkedElsewhere.has(reg.id) ? reg : null;
    if (!link) unlinked++;
    const otherDistance = link && link.distanceId !== distanceId ? distName.get(link.distanceId) : undefined;
    if (otherDistance) warnings.push(`Linha ${line}: o dorsal ${bib} (${name}) inscreveu-se em ${otherDistance}.`);

    rows.push({
      line,
      eventId,
      distanceId,
      registrationId: link?.id ?? null,
      bib,
      name,
      gender,
      ageGroup: get("ageGroup") || link?.ageGroup || "Sénior",
      club: get("club") || link?.club || "Individual",
      nationality: get("nationality") || link?.nationality || "Angola",
      chipTimeMs: status === "terminou" ? chipTimeMs : null,
      gunTimeMs: status === "terminou" ? gunTimeMs : null,
      status,
      otherDistance,
    });
  });

  if (unlinked) warnings.unshift(`${unlinked} dorsal(ais) sem inscrição neste evento: o resultado aparece na classificação, mas não no perfil de nenhum atleta.`);
  return { rows, errors, warnings, replacing };
}

// ───────────── Classificações ─────────────

/**
 * Recalcula as posições (geral, por sexo e por sexo + escalão) de uma distância numa só instrução.
 * Ordem: tempo de chip (ou oficial, se não houver chip); empate desfeito pelo tempo oficial e pelo dorsal.
 * Quem não terminou fica sem posição.
 */
export async function recomputeRankings(tx: Prisma.TransactionClient, distanceId: string) {
  await tx.$executeRaw`
    UPDATE results r
    SET position = x.p, position_gender = x.g, position_age_group = x.a
    FROM (
      SELECT s.id,
        CASE WHEN s.t IS NULL THEN NULL ELSE row_number() OVER (PARTITION BY s.t IS NULL ORDER BY s.t, s.gun_time_ms NULLS LAST, s.bib) END AS p,
        CASE WHEN s.t IS NULL THEN NULL ELSE row_number() OVER (PARTITION BY s.t IS NULL, s.gender ORDER BY s.t, s.gun_time_ms NULLS LAST, s.bib) END AS g,
        CASE WHEN s.t IS NULL THEN NULL ELSE row_number() OVER (PARTITION BY s.t IS NULL, s.gender, s.age_group ORDER BY s.t, s.gun_time_ms NULLS LAST, s.bib) END AS a
      FROM (
        SELECT id, bib, gender, age_group, gun_time_ms,
          CASE WHEN status = 'terminou' THEN COALESCE(chip_time_ms, gun_time_ms) END AS t
        FROM results WHERE distance_id = ${distanceId}
      ) s
    ) x
    WHERE r.id = x.id`;
}
