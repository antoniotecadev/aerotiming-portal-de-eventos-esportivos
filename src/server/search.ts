import "server-only";
import { Prisma } from "@/generated/prisma/client";

/** Tamanho das páginas das listas públicas (5.10). */
export const PAGE_SIZE = 25;

export const pageOf = (raw: string | number | undefined) => Math.max(1, Math.min(10_000, Math.floor(Number(raw) || 1)));

/** Texto de pesquisa limpo (máx. 80 caracteres), com % e _ escapados para LIKE. */
function likeEscape(q: string) {
  return q.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Condição SQL "nome/clube contém o termo ou o dorsal começa por ele", sem acentos nem maiúsculas
 * (usa public.search_norm, da migração pesquisa_sem_acentos). `null` se não houver termo.
 */
export function textMatch(raw: string | undefined, bib: Prisma.Sql, text: Prisma.Sql): Prisma.Sql | null {
  const q = (raw ?? "").trim().slice(0, 80);
  if (!q) return null;
  const like = likeEscape(q);
  return Prisma.sql`(${bib} = ${q} OR ${bib} LIKE ${`${like}%`} OR public.search_norm(${text}) LIKE '%' || public.search_norm(${like}) || '%')`;
}

/** Junta as condições com AND (sem nenhuma: TRUE). */
export function and(conds: (Prisma.Sql | null | false)[]) {
  const list = conds.filter((c): c is Prisma.Sql => !!c);
  return list.length ? Prisma.join(list, " AND ") : Prisma.sql`TRUE`;
}
