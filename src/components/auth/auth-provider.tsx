"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { User } from "@/lib/types";
import { USERS } from "@/lib/data";

/**
 * Autenticação SIMULADA (sem backend). Guarda o utilizador no localStorage.
 * Contas de demonstração:
 *   atleta → carlos@exemplo.ao / 123456
 *   admin  → admin@aerotiming.ao / admin123
 */
const DEMO_PASSWORDS: Record<string, string> = {
  "carlos@exemplo.ao": "123456",
  "admin@aerotiming.ao": "admin123",
};

const STORAGE_KEY = "aerotiming:user";

interface AuthContextValue {
  user: User | null;
  ready: boolean; // true depois de ler o localStorage (evita "piscar" no cliente)
  login: (email: string, password: string) => { ok: true; user: User } | { ok: false; error: string };
  register: (data: Pick<User, "name" | "email" | "phone"> & Partial<User>) => User;
  updateUser: (patch: Partial<User>) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de <AuthProvider>");
  return ctx;
}

function save(user: User | null) {
  try {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setUser(JSON.parse(raw));
    } catch {}
    setReady(true);
  }, []);

  const login = useCallback<AuthContextValue["login"]>((email, password) => {
    const e = email.trim().toLowerCase();
    const found = USERS.find((u) => u.email === e);
    if (!found) return { ok: false, error: "Não encontrámos uma conta com este e-mail." };
    if ((DEMO_PASSWORDS[e] ?? "123456") !== password) return { ok: false, error: "A palavra-passe está errada. Tente novamente." };
    setUser(found);
    save(found);
    return { ok: true, user: found };
  }, []);

  const register = useCallback<AuthContextValue["register"]>((data) => {
    const u: User = {
      id: `u-${Date.now()}`,
      role: "atleta",
      birthDate: "",
      gender: "M",
      documentType: "BI",
      documentNumber: "",
      province: "Luanda",
      city: "",
      club: "Individual",
      tshirt: "M",
      emergencyContact: { name: "", phone: "", relation: "" },
      createdAt: new Date().toISOString(),
      active: true,
      ...data,
    };
    setUser(u);
    save(u);
    return u;
  }, []);

  const updateUser = useCallback((patch: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    save(null);
  }, []);

  return <AuthContext.Provider value={{ user, ready, login, register, updateUser, logout }}>{children}</AuthContext.Provider>;
}
