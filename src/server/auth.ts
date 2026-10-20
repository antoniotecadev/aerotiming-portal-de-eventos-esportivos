import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { User, UserRole } from "@/lib/types";
import { mapProfile, profileInclude } from "./mappers";

/**
 * Utilizador com sessão iniciada (ou null). Valida o token com getClaims() — nunca confiar
 * em getSession() no servidor. Deduplicado por pedido com cache().
 */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const profile = await prisma.profile.findUnique({ where: { id }, include: profileInclude });
  if (!profile || !profile.active) return null;
  return mapProfile(profile);
});

/** Exige sessão; sem sessão vai para /entrar e volta depois a `next`. */
export async function requireUser(next = "/perfil") {
  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?next=${encodeURIComponent(next)}`);
  return user;
}

/** Pode entrar no painel de gestão: admin, organizador ou staff de algum evento. */
export function canAccessPanel(user: User | null) {
  return !!user && (user.role === "admin" || user.role === "organizador" || (user.staffEvents ?? 0) > 0);
}

export function hasRole(user: User | null, ...roles: UserRole[]) {
  return !!user && roles.includes(user.role);
}

/** Para Server Actions: lança erro se o utilizador não tiver um dos papéis. */
export async function requireRole(...roles: UserRole[]) {
  const user = await getCurrentUser();
  if (!hasRole(user, ...roles)) throw new Error("Sem permissão para esta acção.");
  return user!;
}

/** Páginas do painel só para admin (utilizadores, banners, definições…): o organizador volta ao painel. */
export async function requireAdminPage() {
  const user = await getCurrentUser();
  if (!hasRole(user, "admin")) redirect("/admin");
  return user!;
}
