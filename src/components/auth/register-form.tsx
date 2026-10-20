"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MailCheck, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FormError, PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { safeNext } from "@/components/auth/login-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { signUp } from "@/server/actions/auth";

type Errors = Partial<Record<"name" | "email" | "password" | "terms" | "form", string>>;

/** Registo simples: nome, e-mail e palavra-passe. Os dados da prova são pedidos na 1.ª inscrição. */
export function RegisterForm() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const toast = useToast();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [confirmSent, setConfirmSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (!terms) return setErrors({ terms: "Para continuar, aceite os termos e a política de privacidade." });
    setErrors({});
    startTransition(async () => {
      const res = await signUp({ name, email, password, next });
      if (!res.ok) {
        setErrors(res.field ? { [res.field]: res.error } : { form: res.error });
        return;
      }
      if (res.needsConfirmation) {
        setConfirmSent(true);
        return;
      }
      toast({ title: `Bem-vindo(a), ${name.trim().split(/\s+/)[0]}!`, description: "A sua conta foi criada. Já se pode inscrever nas provas." });
      router.push(res.redirectTo ?? "/perfil");
      refresh();
    });
  }

  if (confirmSent) {
    return (
      <div className="text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <MailCheck className="size-9" />
        </div>
        <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-ink-900">Confirme o seu e-mail</h1>
        <p className="mt-2 text-ink-600">
          Enviámos uma mensagem para <strong className="text-ink-900">{email.trim().toLowerCase()}</strong>. Abra-a e toque no link para activar a conta.
        </p>
        <p className="mt-4 rounded-xl bg-ink-50 p-4 text-sm text-ink-600">Não encontra a mensagem? Veja também a pasta de <em>Spam</em> ou <em>Promoções</em>.</p>
        <ButtonLink href="/entrar" variant="outline" size="lg" className="mt-8 w-full">
          Já confirmei — entrar
        </ButtonLink>
      </div>
    );
  }

  if (user && !pending) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-ink-50 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Já tem sessão iniciada</h1>
        <p className="mt-2 text-ink-600">Está a usar a conta de {user.name}.</p>
        <ButtonLink href={next ?? "/perfil"} className="mt-5 w-full">
          Continuar
        </ButtonLink>
      </div>
    );
  }

  const invalid = (k: keyof Errors) => (errors[k] ? true : undefined);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Criar conta grátis</h1>
      <p className="mt-2 mb-8 text-ink-600">Demora menos de 1 minuto. Com a conta inscreve-se nas provas e acompanha tudo num só lugar.</p>

      <form
        className="space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormError>{errors.form}</FormError>

        <Field label="Nome completo" htmlFor="name" required error={errors.name} hint="Como aparece no seu BI. Vai aparecer nos resultados.">
          <Input id="name" autoComplete="name" placeholder="Ex.: Maria Neto" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={invalid("name")} />
        </Field>

        <Field label="E-mail" htmlFor="email" required error={errors.email} hint="É com ele que vai entrar na sua conta.">
          <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder="nome@exemplo.ao" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={invalid("email")} />
        </Field>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-semibold text-ink-800">
            Palavra-passe<span className="ml-0.5 text-brand-600">*</span>
          </label>
          <PasswordInput id="password" autoComplete="new-password" placeholder="Crie uma palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={invalid("password")} />
          {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : <PasswordStrength value={password} />}
        </div>

        <div>
          <Checkbox
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
            aria-invalid={invalid("terms")}
            label={
              <>
                Li e aceito os{" "}
                <Link href="/termos" target="_blank" className="font-semibold text-brand-700 underline">
                  Termos e condições
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" target="_blank" className="font-semibold text-brand-700 underline">
                  Política de privacidade
                </Link>
                .
              </>
            }
          />
          {errors.terms && <p className="mt-1.5 text-sm text-red-600">{errors.terms}</p>}
        </div>

        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          <UserPlus /> {pending ? "A criar a conta…" : "Criar a minha conta"}
        </Button>

        <p className="text-center text-[15px] text-ink-600">
          Já tem conta?{" "}
          <Link href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"} className="font-semibold text-brand-700 hover:underline">
            Entrar
          </Link>
        </p>
      </form>
    </div>
  );
}
