import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * Destino dos links enviados por e-mail (confirmar conta, recuperar palavra-passe).
 * Troca o código do link por uma sessão e segue para `next`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const rawNext = searchParams.get("next") ?? "/perfil";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/perfil";

  const supabase = await createClient();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: new Error("Link incompleto") };

  if (error) {
    const fail = new URL("/entrar", origin);
    fail.searchParams.set("erro", "link");
    return NextResponse.redirect(fail);
  }
  return NextResponse.redirect(new URL(next, origin));
}
