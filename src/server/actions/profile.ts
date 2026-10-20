"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { today } from "@/lib/today";
import type { User } from "@/lib/types";
import { getCurrentUser } from "../auth";
import { mapProfile, profileInclude } from "../mappers";
import { LIMITS, hitAll, tooManyMessage } from "../rate-limit";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; field?: string };

const digits = (v: string) => v.replace(/\D/g, "");
/** "923 481 902" → "+244923481902" (vazio → null) */
const toE164 = (v: string) => {
  const d = digits(v);
  if (!d) return null;
  return `+244${d.startsWith("244") && d.length > 9 ? d.slice(3) : d}`;
};
const aoPhone = z
  .string()
  .trim()
  .refine((v) => !v || /^9\d{8}$/.test(digits(v).replace(/^244(?=\d{9}$)/, "")), { message: "O número deve ter 9 dígitos e começar por 9." });
const optionalText = z.string().trim().max(120).optional().default("");

// ───────────── Os meus dados ─────────────

const profileSchema = z.object({
  name: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => v.split(" ").length >= 2, { message: "Escreva o primeiro e o último nome." }),
  phone: aoPhone,
  birthDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/).optional().default(""),
  gender: z.enum(["M", "F", ""]).optional().default(""),
  documentType: z.enum(["BI", "Passaporte"]).default("BI"),
  documentNumber: optionalText,
  province: optionalText,
  city: optionalText,
  club: optionalText,
  tshirt: z.enum(["XS", "S", "M", "L", "XL", "XXL", ""]).optional().default(""),
  bloodType: optionalText,
  emergencyName: optionalText,
  emergencyPhone: aoPhone.optional().default(""),
  emergencyRelation: optionalText,
});

export async function updateProfile(input: z.input<typeof profileSchema>): Promise<Result<{ user: User }>> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "A sua sessão terminou. Entre outra vez." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, error: issue.message, field: String(issue.path[0]) };
  }
  const d = parsed.data;
  const phone = toE164(d.phone);

  if (phone) {
    const taken = await prisma.profile.findFirst({ where: { phone, id: { not: me.id } }, select: { id: true } });
    if (taken) return { ok: false, error: "Este telemóvel já está associado a outra conta.", field: "phone" };
  }

  const row = await prisma.profile.update({
    where: { id: me.id },
    data: {
      name: d.name,
      phone,
      birthDate: d.birthDate ? new Date(`${d.birthDate}T00:00:00Z`) : null,
      gender: d.gender || null,
      documentType: d.documentType === "Passaporte" ? "PASSAPORTE" : "BI",
      documentNumber: d.documentNumber.toUpperCase() || null,
      province: d.province || null,
      city: d.city || null,
      club: d.club || null,
      tshirt: d.tshirt || null,
      bloodType: d.bloodType || null,
      emergencyName: d.emergencyName || null,
      emergencyPhone: toE164(d.emergencyPhone),
      emergencyRelation: d.emergencyRelation || null,
    },
    include: profileInclude,
  });
  return { ok: true, user: mapProfile(row) };
}

// ───────────── Notificações ─────────────

export async function updateNotifications(input: { sms: boolean; email: boolean; whatsapp: boolean }): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "A sua sessão terminou. Entre outra vez." };
  await prisma.profile.update({
    where: { id: me.id },
    data: { notifySms: !!input.sms, notifyEmail: !!input.email, notifyWhatsapp: !!input.whatsapp },
  });
  return { ok: true };
}

// ───────────── Mudar palavra-passe ─────────────

export async function changePassword(input: { current: string; password: string }): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "A sua sessão terminou. Entre outra vez." };
  if (!input.current) return { ok: false, error: "Escreva a palavra-passe que usa agora." };
  if ((input.password ?? "").length < 6) return { ok: false, error: "A nova palavra-passe precisa de ter pelo menos 6 caracteres." };
  if (input.password === input.current) return { ok: false, error: "A nova palavra-passe tem de ser diferente da actual." };
  const limit = await hitAll([LIMITS.passwordUser, me.id]);
  if (!limit.ok) return { ok: false, error: tooManyMessage(limit.retryAfterSec) };

  const supabase = await createClient();
  // Confirma a palavra-passe actual antes de a trocar
  const check = await supabase.auth.signInWithPassword({ email: me.email, password: input.current });
  if (check.error) return { ok: false, error: "A palavra-passe actual está errada." };
  const { error } = await supabase.auth.updateUser({ password: input.password });
  if (error) return { ok: false, error: error.code === "weak_password" ? "A nova palavra-passe é demasiado fraca." : "Não foi possível alterar a palavra-passe." };
  return { ok: true };
}

// ───────────── Apagar conta ─────────────

/**
 * Cancela as inscrições em provas futuras (devolvendo as vagas), apaga a conta no Supabase Auth
 * (o trigger apaga o perfil) e termina a sessão. As inscrições e resultados de provas passadas
 * ficam sem ligação à conta (user_id = null).
 */
export async function deleteAccount(input: { confirm: string }): Promise<Result> {
  const me = await getCurrentUser();
  if (!me) return { ok: false, error: "A sua sessão terminou. Entre outra vez." };
  if (input.confirm.trim().toUpperCase() !== "APAGAR") return { ok: false, error: 'Escreva "APAGAR" para confirmar.' };
  if (me.role === "admin" && (await prisma.profile.count({ where: { role: "admin", active: true } })) <= 1) {
    return { ok: false, error: "É o único administrador. Promova outra pessoa a administrador antes de apagar a sua conta." };
  }

  const future = await prisma.registration.findMany({
    where: { userId: me.id, status: { in: ["pagamento_pendente", "confirmada"] }, event: { date: { gte: new Date(`${today()}T00:00:00Z`) } } },
    select: { id: true, distanceId: true },
  });
  await prisma.$transaction([
    ...future.map((r) => prisma.registration.update({ where: { id: r.id }, data: { status: "cancelada", cancelledAt: new Date() } })),
    ...future.map((r) => prisma.eventDistance.update({ where: { id: r.distanceId }, data: { slotsTaken: { decrement: 1 } } })),
  ]);

  const { error } = await createAdminClient().auth.admin.deleteUser(me.id);
  if (error) return { ok: false, error: "Não foi possível apagar a conta. Tente novamente ou fale connosco." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  return { ok: true };
}
