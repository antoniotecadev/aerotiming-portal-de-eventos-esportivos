"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, KeyRound, LogIn, MessageSquareText, Send } from "lucide-react";
import { FormError, PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

type Stage = "identify" | "code" | "password" | "done";

/** Esconde parte do contacto: carlos@exemplo.ao → ca•••@exemplo.ao */
function mask(v: string) {
  const t = v.trim();
  if (t.includes("@")) {
    const [user, domain] = t.split("@");
    return `${user.slice(0, 2)}•••@${domain}`;
  }
  const d = t.replace(/\D/g, "");
  return `+244 ••• ••• ${d.slice(-3)}`;
}

export function RecoverForm() {
  const toast = useToast();
  const [stage, setStage] = useState<Stage>("identify");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const wait = (fn: () => void) => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      fn();
    }, 500);
  };

  const viaEmail = identifier.includes("@");

  if (stage === "done")
    return (
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <CheckCircle2 className="size-9" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">Palavra-passe alterada!</h1>
        <p className="mt-2 text-ink-600">Já pode entrar na sua conta com a nova palavra-passe.</p>
        <ButtonLink href="/entrar" size="lg" className="mt-8 w-full">
          <LogIn /> Entrar agora
        </ButtonLink>
      </div>
    );

  return (
    <div>
      <div className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        {stage === "identify" ? <KeyRound className="size-7" /> : stage === "code" ? <MessageSquareText className="size-7" /> : <KeyRound className="size-7" />}
      </div>

      {stage === "identify" && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Esqueceu-se da palavra-passe?</h1>
          <p className="mt-2 text-ink-600">Não há problema. Diga-nos o seu e-mail ou telemóvel e enviamos um código para criar uma nova.</p>
          <form
            className="mt-8 space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              const v = identifier.trim();
              const ok = v.includes("@") ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) : v.replace(/\D/g, "").length >= 9;
              if (!ok) return setError("Escreva um e-mail válido ou um número de telemóvel com 9 dígitos.");
              wait(() => {
                setStage("code");
                setCooldown(60);
              });
            }}
          >
            <FormError>{error}</FormError>
            <Field label="E-mail ou telemóvel" htmlFor="identifier" hint="O mesmo que usou para criar a conta.">
              <Input id="identifier" autoComplete="username" placeholder="nome@exemplo.ao ou 923 000 000" value={identifier} onChange={(e) => setIdentifier(e.target.value)} aria-invalid={!!error} />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              <Send /> {loading ? "A enviar…" : "Enviar código"}
            </Button>
          </form>
        </>
      )}

      {stage === "code" && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">{viaEmail ? "Enviámos um código por e-mail" : "Enviámos um código por SMS"}</h1>
          <p className="mt-2 text-ink-600">
            Escreva o código de 6 números que enviámos para <strong className="text-ink-900">{mask(identifier)}</strong>. Pode demorar até 1 minuto a chegar.
          </p>
          <form
            className="mt-8 space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (!/^\d{6}$/.test(code)) return setError("O código tem 6 números. Verifique a mensagem que recebeu.");
              wait(() => setStage("password"));
            }}
          >
            <FormError>{error}</FormError>
            <Field label="Código de 6 números" htmlFor="code" hint="Demonstração: pode usar qualquer código, ex.: 123456.">
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="••••••"
                className="h-14 text-center font-mono text-2xl tracking-[0.5em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                aria-invalid={!!error}
              />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "A verificar…" : "Confirmar código"}
            </Button>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <button type="button" className="inline-flex items-center gap-1.5 font-semibold text-ink-600 hover:text-ink-900" onClick={() => setStage("identify")}>
                <ArrowLeft className="size-4" /> Mudar contacto
              </button>
              <button
                type="button"
                disabled={cooldown > 0}
                className="font-semibold text-brand-700 hover:underline disabled:text-ink-400 disabled:no-underline"
                onClick={() => {
                  setCooldown(60);
                  toast({ title: "Código reenviado", description: `Enviámos um novo código para ${mask(identifier)}.`, tone: "info" });
                }}
              >
                {cooldown > 0 ? `Reenviar código em ${cooldown}s` : "Não recebi — reenviar código"}
              </button>
            </div>
          </form>
        </>
      )}

      {stage === "password" && (
        <>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Crie uma nova palavra-passe</h1>
          <p className="mt-2 text-ink-600">Escolha uma palavra-passe que não use noutros sites.</p>
          <form
            className="mt-8 space-y-5"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              if (password.length < 6) return setError("A palavra-passe precisa de ter pelo menos 6 caracteres.");
              if (password !== confirm) return setError("As duas palavras-passe não são iguais. Escreva de novo.");
              wait(() => setStage("done"));
            }}
          >
            <FormError>{error}</FormError>
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="block text-sm font-semibold text-ink-800">
                Nova palavra-passe
              </label>
              <PasswordInput id="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <PasswordStrength value={password} />
            </div>
            <Field label="Repita a nova palavra-passe" htmlFor="confirm-password">
              <PasswordInput id="confirm-password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? "A guardar…" : "Guardar nova palavra-passe"}
            </Button>
          </form>
        </>
      )}

      <p className="mt-8 text-center text-[15px] text-ink-600">
        Lembrou-se?{" "}
        <Link href="/entrar" className="font-semibold text-brand-700 hover:underline">
          Voltar a entrar
        </Link>
      </p>
    </div>
  );
}
