"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { signOut } from "@/server/actions/auth";

/**
 * Sessão real (Supabase Auth). O utilizador é lido no SERVIDOR (src/server/auth.ts, a partir
 * dos cookies) e passado aqui pelo layout raiz. Depois de entrar/sair, as Server Actions
 * mudam os cookies e `router.refresh()` volta a pedir o utilizador ao servidor.
 */
interface AuthContextValue {
  user: User | null;
  /** Mantido por compatibilidade: com a sessão vinda do servidor está sempre pronto. */
  ready: boolean;
  /** Actualiza os dados mostrados depois de uma Server Action gravar o perfil. */
  updateUser: (patch: Partial<User>) => void;
  /** Volta a ler a sessão do servidor (ex.: depois de entrar). */
  refresh: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

export function AuthProvider({ initialUser, children }: { initialUser: User | null; children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(initialUser);

  // O servidor é a fonte de verdade: sempre que o layout volta a correr, sincroniza.
  useEffect(() => setUser(initialUser), [initialUser]);

  const updateUser = useCallback((patch: Partial<User>) => setUser((prev) => (prev ? { ...prev, ...patch } : prev)), []);
  const refresh = useCallback(() => router.refresh(), [router]);
  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    router.refresh();
  }, [router]);

  return <AuthContext.Provider value={{ user, ready: true, updateUser, refresh, logout }}>{children}</AuthContext.Provider>;
}
