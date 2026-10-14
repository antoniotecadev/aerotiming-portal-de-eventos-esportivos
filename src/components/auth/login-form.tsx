"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Info, LogIn, Mail, Sparkles } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FormError, PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { USERS } from "@/lib/data";
import type { User } from "@/lib/types";

const digits = (s: string) => s.replace(/\D/g, "");

/** Aceita e-mail ou número de telemóvel e devolve o e-mail da conta. */
function resolveEmail(identifier: string) {
  const v = identifier.trim();
  if (v.includes("@")) return v;
  const d = digits(v).slice(-9);
  if (d.length < 9) return v;
  return USERS.find((u) => digits(u.phone).slice(-9) === d)?.email ?? v;
}

/** Só aceita caminhos internos (evita redireccionar para outros sites). */
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function redirectFor(user: User, next: string | null) {
  return safeNext(next) ?? (user.role === "admin" ? "/admin" : "/perfil");
}

const DEMO = [
  { label: "Atleta", email: "carlos@exemplo.ao", password: "123456" },
  { label: "Administrador", email: "admin@aerotiming.ao", password: "admin123" },
];

export function LoginForm() {
  const { login, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const toast = useToast();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Já tem sessão iniciada → segue em frente
  useEffect(() => {
    if (ready && user && !loading) router.replace(redirectFor(user, next));
  }, [ready, user, next, router, loading]);

  function doLogin(id: string, pw: string) {
    setError(null);
    if (!id.trim()) return setError("Escreva o seu e-mail ou número de telemóvel.");
    if (!pw) return setError("Escreva a sua palavra-passe.");
    setLoading(true);
    setTimeout(() => {
      const res = login(resolveEmail(id), pw);
      if (!res.ok) {
        setLoading(false);
        setError(res.error);
        return;
      }
      toast({ title: `Olá, ${res.user.name.split(" ")[0]}!`, description: "Sessão iniciada com sucesso." });
      router.push(redirectFor(res.user, next));
    }, 400);
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Entrar na sua conta</h1>
      <p className="mt-2 text-ink-600">Veja as suas inscrições, bilhetes e resultados.</p>

      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          doLogin(identifier, password);
        }}
      >
        <FormError>{error}</FormError>

        <Field label="E-mail ou telemóvel" htmlFor="identifier" hint="Ex.: nome@exemplo.ao ou 923 000 000">
          <Input
            id="identifier"
            autoComplete="username"
            inputMode="email"
            placeholder="nome@exemplo.ao"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            aria-invalid={!!error && !identifier.trim()}
          />
        </Field>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="password" className="block text-sm font-semibold text-ink-800">
              Palavra-passe
            </label>
            <Link href="/recuperar-senha" className="text-sm font-semibold text-brand-700 hover:underline">
              Esqueci-me da palavra-passe
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="A sua palavra-passe"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={!!error && !!identifier.trim()}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          <LogIn />
          {loading ? "A entrar…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[15px] text-ink-600">
        Ainda não tem conta?{" "}
        <Link href={next ? `/criar-conta?next=${encodeURIComponent(next)}` : "/criar-conta"} className="font-semibold text-brand-700 hover:underline">
          Criar conta grátis
        </Link>
      </p>

      {/* Contas de demonstração */}
      <div className="mt-8 rounded-2xl border border-sky-200 bg-sky-50 p-5">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-sky-700" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-sky-900">Quer só experimentar?</p>
            <p className="mt-0.5 text-sm text-sky-800">Este site é uma demonstração. Pode usar estas contas:</p>
            <ul className="mt-3 space-y-2">
              {DEMO.map((d) => (
                <li key={d.email} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/80 px-3 py-2 text-sm ring-1 ring-sky-200">
                  <span className="min-w-0">
                    <span className="font-semibold text-ink-900">{d.label}</span>
                    <span className="block truncate text-ink-600">
                      <Mail className="mr-1 inline size-3.5" />
                      {d.email} · <span className="font-mono">{d.password}</span>
                    </span>
                  </span>
                  <button
                    type="button"
                    className="text-sm font-semibold text-sky-800 hover:underline"
                    onClick={() => {
                      setIdentifier(d.email);
                      setPassword(d.password);
                      setError(null);
                    }}
                  >
                    Preencher
                  </button>
                </li>
              ))}
            </ul>
            <Button variant="dark" className="mt-4 w-full" disabled={loading} onClick={() => doLogin(DEMO[0].email, DEMO[0].password)}>
              <Sparkles />
              Usar conta de demonstração
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
