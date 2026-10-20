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

export const and = (conds: (Prisma.Sql | null)[]) => Prisma.join(conds.filter((c): c is Prisma.Sql => !!c), " AND ");
