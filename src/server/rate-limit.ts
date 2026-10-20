import "server-only";
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

/**
 * Limite de tentativas (7.9), guardado na BD (tabela rate_limits) para funcionar com várias
 * instâncias do servidor. Janela fixa: ao fim de `windowSec` o contador recomeça.
 */

export interface Limit {
  /** Ex.: "login:email". O valor (e-mail, IP…) é acrescentado pela função. */
  name: string;
  max: number;
  windowSec: number;
}

export const LIMITS = {
  loginEmail: { name: "login:email", max: 10, windowSec: 15 * 60 },
  loginIp: { name: "login:ip", max: 30, windowSec: 15 * 60 },
  signupIp: { name: "signup:ip", max: 5, windowSec: 60 * 60 },
  resetEmail: { name: "reset:email", max: 3, windowSec: 60 * 60 },
  resetIp: { name: "reset:ip", max: 10, windowSec: 60 * 60 },
  passwordUser: { name: "password:user", max: 5, windowSec: 15 * 60 },
  registrationUser: { name: "registration:user", max: 10, windowSec: 60 * 60 },
  registrationIp: { name: "registration:ip", max: 30, windowSec: 60 * 60 },
  contactIp: { name: "contact:ip", max: 10, windowSec: 60 * 60 },
} satisfies Record<string, Limit>;

/** IP de quem faz o pedido (Vercel e a maioria dos proxies enviam x-forwarded-for). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "desconhecido";
}

/** Conta uma tentativa. Devolve `ok: false` (com os segundos de espera) quando o limite já foi ultrapassado. */
export async function hit(limit: Limit, value: string): Promise<{ ok: true } | { ok: false; retryAfterSec: number }> {
  const key = `${limit.name}:${value.toLowerCase()}`;
  const [row] = await prisma.$queryRaw<{ hits: number; window_start: Date }[]>`
    INSERT INTO rate_limits (key, window_start, hits) VALUES (${key}, now(), 1)
    ON CONFLICT (key) DO UPDATE SET
      hits = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => ${limit.windowSec}) THEN 1 ELSE rate_limits.hits + 1 END,
      window_start = CASE WHEN rate_limits.window_start <= now() - make_interval(secs => ${limit.windowSec}) THEN now() ELSE rate_limits.window_start END
    RETURNING hits, window_start`;
  if (row.hits <= limit.max) return { ok: true };
  const retryAfterSec = Math.max(1, Math.ceil((row.window_start.getTime() + limit.windowSec * 1000 - Date.now()) / 1000));
  return { ok: false, retryAfterSec };
}

/** Conta a tentativa em vários limites ao mesmo tempo; falha se algum for ultrapassado. */
export async function hitAll(...checks: [Limit, string][]) {
  const results = await Promise.all(checks.map(([l, v]) => hit(l, v)));
  const blocked = results.filter((r) => !r.ok);
  return blocked.length ? { ok: false as const, retryAfterSec: Math.max(...blocked.map((b) => b.retryAfterSec)) } : { ok: true as const };
}

/** "Fez muitas tentativas seguidas. Tente de novo dentro de 12 minutos." */
export function tooManyMessage(retryAfterSec: number) {
  const min = Math.ceil(retryAfterSec / 60);
  return `Fez muitas tentativas seguidas. Tente de novo dentro de ${min <= 1 ? "1 minuto" : `${min} minutos`}.`;
}

/** Limpeza: apaga contadores com mais de 1 dia (chamado pela tarefa agendada). */
export async function purgeRateLimits() {
  return prisma.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(Date.now() - 24 * 3600 * 1000) } } });
}
