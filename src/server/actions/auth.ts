"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { getCurrentUser } from "../auth";
import { clearRecoverySession, hasRecoverySession } from "../recovery";
import { LIMITS, clientIp, hitAll, tooManyMessage } from "../rate-limit";

export type AuthResult =
  | { ok: true; redirectTo?: string; needsConfirmation?: boolean }
  | { ok: false; error: string; field?: "name" | "email" | "password" };

/** Endereço do site para os links dos e-mails — só o configurado, nunca o cabeçalho Origin do pedido (12.4, B2). */
function siteOrigin() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/** Traduz os erros do Supabase Auth para mensagens simples. */
function authMessage(code: string | undefined, fallback: string) {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou palavra-passe errados. Verifique e tente outra vez.";
    case "email_not_confirmed":
      return "Ainda não confirmou o seu e-mail. Abra a mensagem que lhe enviámos e toque no link.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail. Entre ou recupere a palavra-passe.";
    case "weak_password":
      return "A palavra-passe é demasiado fraca. Use pelo menos 6 caracteres, com letras e números.";
    case "email_address_invalid":
      return "Este e-mail não é válido.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Fez muitas tentativas seguidas. Espere alguns minutos e tente de novo.";
    case "same_password":
      return "A nova palavra-passe tem de ser diferente da actual.";
    default:
      return fallback;
  }
}

const email = z.string().trim().toLowerCase().pipe(z.email({ message: "Este e-mail não parece correcto. Ex.: nome@exemplo.ao" }));
const password = z.string().min(6, { message: "A palavra-passe precisa de ter pelo menos 6 caracteres." });

function firstIssue(err: z.ZodError) {
  const issue = err.issues[0];
  return { ok: false as const, error: issue.message, field: issue.path[0] as "name" | "email" | "password" };
}

// ───────────── Entrar ─────────────

const signInSchema = z.object({ email, password: z.string().min(1, { message: "Escreva a sua palavra-passe." }) });

export async function signIn(input: { email: string; password: string; next?: string | null }): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const limit = await hitAll([LIMITS.loginEmail, parsed.data.email], [LIMITS.loginIp, await clientIp()]);
  if (!limit.ok) return { ok: false, error: tooManyMessage(limit.retryAfterSec) };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { ok: false, error: authMessage(error?.code, "Não foi possível entrar. Tente novamente.") };

  const profile = await prisma.profile.findUnique({ where: { id: data.user.id }, select: { role: true, active: true } });
  if (!profile?.active) {
    await supabase.auth.signOut();
    return { ok: false, error: "Esta conta está desactivada. Fale connosco pelo WhatsApp ou pela página de contacto." };
  }
  const fallback = profile.role === "admin" || profile.role === "organizador" ? "/admin" : "/perfil";
  return { ok: true, redirectTo: safeNext(input.next) ?? fallback };
}

// ───────────── Criar conta ─────────────

const signUpSchema = z.object({
  name: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, " "))
    .refine((v) => v.split(" ").length >= 2, { message: "Escreva o primeiro e o último nome (ex.: Maria Neto)." }),
  email,
  password,
});

export async function signUp(input: { name: string; email: string; password: string; acceptedTerms: boolean; next?: string | null }): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  // Lei n.º 22/11 (12.5): o consentimento é verificado no servidor e fica registado na conta
  if (input.acceptedTerms !== true) return { ok: false, error: "Para continuar, aceite os termos e a política de privacidade." };
  const limit = await hitAll([LIMITS.signupIp, await clientIp()]);
  if (!limit.ok) return { ok: false, error: tooManyMessage(limit.retryAfterSec) };
  const next = safeNext(input.next) ?? "/perfil";

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { name: parsed.data.name, terms_accepted_at: new Date().toISOString() }, // name: o trigger handle_new_user cria o perfil
      emailRedirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, error: authMessage(error.code, "Não foi possível criar a conta. Tente novamente."), field: error.code === "weak_password" ? "password" : "email" };

  // Com confirmação de e-mail ligada, o Supabase não revela se o e-mail já existia: devolve um utilizador sem identidades.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: authMessage("user_already_exists", ""), field: "email" };
  }
  if (!data.session) return { ok: true, needsConfirmation: true };
  return { ok: true, redirectTo: next };
}

// ───────────── Sair ─────────────

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
}

// ───────────── Recuperar palavra-passe ─────────────

export async function requestPasswordReset(input: { email: string }): Promise<AuthResult> {
  const parsed = z.object({ email }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);
  const limit = await hitAll([LIMITS.resetEmail, parsed.data.email], [LIMITS.resetIp, await clientIp()]);
  if (!limit.ok) return { ok: false, error: tooManyMessage(limit.retryAfterSec) };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteOrigin()}/auth/callback?next=/nova-palavra-passe`,
  });
  // Por segurança, não dizemos se o e-mail existe ou não — só erros de limite.
  if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit")) {
    return { ok: false, error: authMessage(error.code, "") };
  }
  return { ok: true };
}

/** Define uma nova palavra-passe (depois do link de recuperação, que já inicia sessão). */
export async function updatePassword(input: { password: string }): Promise<AuthResult> {
  const parsed = z.object({ password }).safeParse(input);
  if (!parsed.success) return firstIssue(parsed.error);

  // Só depois de abrir o link de recuperação (cookie assinado, 15 min). Com uma sessão normal, a
  // palavra-passe muda-se em Perfil → Segurança, que pede a actual (12.4, M3).
  const me = await getCurrentUser();
  if (!me || !(await hasRecoverySession(me.id))) return { ok: false, error: "O link expirou. Peça um novo link de recuperação." };
  const limit = await hitAll([LIMITS.passwordUser, me.id]);
  if (!limit.ok) return { ok: false, error: tooManyMessage(limit.retryAfterSec) };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: authMessage(error.code, "Não foi possível alterar a palavra-passe."), field: "password" };
  await clearRecoverySession();
  return { ok: true, redirectTo: "/perfil" };
}
