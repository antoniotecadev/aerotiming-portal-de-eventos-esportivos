import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

/**
 * Cliente Supabase para o servidor (Server Components, Server Actions, Route Handlers).
 * Criar um novo em cada pedido — nunca reutilizar entre pedidos.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Chamado a partir de um Server Component (não pode escrever cookies).
          // Não faz mal: o src/proxy.ts renova a sessão em cada pedido.
        }
      },
    },
  });
}
