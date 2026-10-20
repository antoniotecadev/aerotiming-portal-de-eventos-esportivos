import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/server/auth";
import { exportPersonalData } from "@/server/privacy";

/** "Descarregar os meus dados" (Lei n.º 22/11 — direito de acesso e portabilidade, 12.5). Só os dados de quem pede. */
export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "Entre na sua conta para descarregar os seus dados." }, { status: 401 });
  // Data de criação e consentimentos ficam na conta do Supabase Auth (lida no servidor, pelo id da sessão)
  const { data } = await createAdminClient().auth.admin.getUserById(me.id);
  const body = await exportPersonalData(me.id, { email: me.email, created_at: data.user?.created_at, user_metadata: data.user?.user_metadata });
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="os-meus-dados-${new Date().toISOString().slice(0, 10)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
