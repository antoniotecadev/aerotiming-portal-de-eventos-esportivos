"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FormError, PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { signIn } from "@/server/actions/auth";
import type { User } from "@/lib/types";

/** Só aceita caminhos internos (evita redireccionar para outros sites). */
export function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : null;
}

export function redirectFor(user: User, next: string | null) {
  return safeNext(next) ?? (user.role === "admin" || user.role === "organizador" ? "/admin" : "/perfil");
}

export function LoginForm() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next");
  const linkError = params.get("erro") === "link";
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(linkError ? "O link que usou expirou ou já foi usado. Entre com a sua palavra-passe ou peça um novo link." : null);
  const [field, setField] = useState<string | undefined>();
  const [pending, startTransition] = useTransition();

  // Já tem sessão iniciada → segue em frente
  useEffect(() => {
    if (user && !pending) router.replace(redirectFor(user, next));
  }, [user, next, router, pending]);

  function submit() {
    setError(null);
    setField(undefined);
    startTransition(async () => {
      const res = await signIn({ email, password, next });
      if (!res.ok) {
        setError(res.error);
        setField(res.field);
        return;
      }
      toast({ title: "Sessão iniciada", description: "Bem-vindo(a) de volta!" });
      router.push(res.redirectTo ?? "/perfil");
      refresh();
    });
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
          submit();
        }}
      >
        <FormError>{error}</FormError>

        <Field label="E-mail" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="nome@exemplo.ao"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-invalid={field === "email" || undefined}
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
            aria-invalid={field === "password" || undefined}
          />
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          <LogIn />
          {pending ? "A entrar…" : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-[15px] text-ink-600">
        Ainda não tem conta?{" "}
        <Link href={next ? `/criar-conta?next=${encodeURIComponent(next)}` : "/criar-conta"} className="font-semibold text-brand-700 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}
