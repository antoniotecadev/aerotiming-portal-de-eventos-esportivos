import { NextResponse, type NextRequest } from "next/server";
import { expireStaleRegistrations } from "@/server/registrations";

/**
 * Expira as inscrições sem comprovativo depois do prazo (tarefa 7.7).
 * Chamado por um agendador (Vercel Cron, Supabase Cron…) com o cabeçalho
 * `Authorization: Bearer <CRON_SECRET>`. Também corre automaticamente antes de cada inscrição.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const expired = await expireStaleRegistrations();
  return NextResponse.json({ ok: true, expired });
}
