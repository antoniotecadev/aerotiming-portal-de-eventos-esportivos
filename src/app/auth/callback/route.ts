import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";
import { RECOVERY_COOKIE, recoveryCookieValue } from "@/server/recovery";

/**
 * Destino dos links enviados por e-mail (confirmar conta, recuperar palavra-passe).
 * Troca o código do link por uma sessão e segue para `next` (só caminhos internos).
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNext(searchParams.get("next")) ?? "/perfil";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { data, error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { data: { user: null }, error: new Error("Link incompleto") };

  if (error || !data.user) {
    const fail = new URL("/entrar", origin);
    fail.searchParams.set("erro", "link");
    return NextResponse.redirect(fail);
  }
  const res = NextResponse.redirect(new URL(next, origin));
  // Link de recuperação: autoriza definir uma palavra-passe nova nos próximos 15 minutos (12.4)
  if (type === "recovery" || next === "/nova-palavra-passe") {
    const { value, maxAge } = recoveryCookieValue(data.user.id);
    res.cookies.set(RECOVERY_COOKIE, value, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", maxAge, path: "/" });
  }
  return res;
}
