import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

/**
 * Sessão de recuperação de palavra-passe (12.4, M3): o link do e-mail "Recuperar palavra-passe" grava
 * este cookie assinado (15 min). Só com ele se pode definir uma palavra-passe nova SEM indicar a actual —
 * uma sessão normal (ex.: computador partilhado) não chega.
 */
export const RECOVERY_COOKIE = "cs_pw_recovery";
const TTL_SEC = 15 * 60;

const sign = (payload: string) => createHmac("sha256", `recovery:${process.env.SUPABASE_SECRET_KEY ?? ""}`).update(payload).digest("base64url");

export function recoveryCookieValue(userId: string) {
  const payload = `${userId}.${Math.floor(Date.now() / 1000) + TTL_SEC}`;
  return { value: `${payload}.${sign(payload)}`, maxAge: TTL_SEC };
}

/** true se o cookie existir, for desta pessoa, estiver dentro do prazo e a assinatura for válida. */
export async function hasRecoverySession(userId: string) {
  const raw = (await cookies()).get(RECOVERY_COOKIE)?.value;
  if (!raw) return false;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig || id !== userId || Number(exp) < Date.now() / 1000) return false;
  const expected = Buffer.from(sign(`${id}.${exp}`));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

export async function clearRecoverySession() {
  (await cookies()).delete(RECOVERY_COOKIE);
}
