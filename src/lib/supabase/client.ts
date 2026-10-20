import { createBrowserClient } from "@supabase/ssr";

/** Cliente Supabase para o browser (componentes "use client"). Só usa a chave publicável. */
export function createClient() {
  return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
}
