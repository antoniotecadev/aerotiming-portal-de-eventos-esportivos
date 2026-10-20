"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, MailCheck, Send } from "lucide-react";
import { FormError } from "@/components/auth/password-input";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { requestPasswordReset } from "@/server/actions/auth";

/** Passo 1 da recuperação: pedir o link por e-mail. O passo 2 é /nova-palavra-passe. */
export function RecoverForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await requestPasswordReset({ email });
      if (!res.ok) return setError(res.error);
      setSent(true);
    });
  }

  if (sent)
    return (
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <MailCheck className="size-9" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">Veja o seu e-mail</h1>
        <p className="mt-2 text-ink-600">
          Se existir uma conta com <strong className="text-ink-900">{email.trim().toLowerCase()}</strong>, enviámos um link para criar uma nova palavra-passe.
        </p>
        <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left text-[15px] text-ink-700">
          <li>1. Abra a mensagem da ConexãoSport.</li>
          <li>2. Toque em <strong>“Redefinir palavra-passe”</strong>.</li>
          <li>3. Escreva a nova palavra-passe.</li>
        </ol>
        <p className="mt-6 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">Não chegou? Veja a pasta de <em>Spam</em> ou espere 1 minuto e tente de novo.</p>
        <div className="mt-8 flex flex-col gap-3">
          <Button variant="outline" size="lg" onClick={() => setSent(false)}>
            Enviar outra vez
          </Button>
          <ButtonLink href="/entrar" variant="ghost">
            <ArrowLeft /> Voltar a entrar
          </ButtonLink>
        </div>
      </div>
    );

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Recuperar palavra-passe</h1>
      <p className="mt-2 text-ink-600">Escreva o e-mail da sua conta. Enviamos um link para criar uma palavra-passe nova.</p>
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
          <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder="nome@exemplo.ao" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          <Send /> {pending ? "A enviar…" : "Enviar link"}
        </Button>
      </form>
      <p className="mt-6 text-center text-[15px] text-ink-600">
        Lembrou-se?{" "}
        <Link href="/entrar" className="font-semibold text-brand-700 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
