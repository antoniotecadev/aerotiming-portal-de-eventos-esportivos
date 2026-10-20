"use server";

import { getCurrentUser, hasRole } from "../auth";
import { searchAdmin } from "../queries/admin-lists";

/** Pesquisa global do painel (inscrições e, para o admin, utilizadores) — feita no servidor (12.10). */
export async function adminSearch(q: string) {
  const user = await getCurrentUser();
  if (!hasRole(user, "admin", "organizador") || typeof q !== "string") return { participants: [], users: [] };
  return searchAdmin(user!, q.slice(0, 80));
}
