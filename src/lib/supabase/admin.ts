import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Cliente com a chave SECRETA: ignora todas as regras de segurança.
 * Usar só no servidor, para operações de administração (ex.: apagar uma conta).
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
