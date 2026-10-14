"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, UserPlus } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FormError, PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { PhoneInput, isValidAoPhone } from "@/components/auth/phone-input";
import { safeNext } from "@/components/auth/login-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { PROVINCES, USERS } from "@/lib/data";
import type { Gender, TShirtSize, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES: TShirtSize[] = ["XS", "S", "M", "L", "XL", "XXL"];
const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());

type Errors = Partial<Record<"name" | "email" | "phone" | "password" | "terms", string>>;

function Steps({ step }: { step: 1 | 2 }) {
  const items = ["Os seus dados", "Detalhes (opcional)"];
  return (
    <ol className="mb-8 flex items-center gap-3" aria-label="Passos">
      {items.map((label, i) => {
        const n = i + 1;
        const done = step > n;
        const active = step === n;
        return (
          <li key={label} className="flex flex-1 items-center gap-2.5">
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold",
                done ? "bg-emerald-500 text-white" : active ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-500",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="size-4" /> : n}
            </span>
            <span className={cn("text-sm font-semibold", active ? "text-ink-900" : "text-ink-500")}>{label}</span>
            {n < items.length && <span className="hidden h-px flex-1 bg-ink-200 sm:block" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}

export function RegisterForm() {
  const { register, user, ready } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const toast = useToast();

  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Errors>({});

  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [documentType, setDocumentType] = useState<User["documentType"]>("BI");
  const [documentNumber, setDocumentNumber] = useState("");
  const [province, setProvince] = useState("Luanda");
  const [club, setClub] = useState("");
  const [tshirt, setTshirt] = useState<TShirtSize | "">("");
  const [done, setDone] = useState(false);

  function validateStep1() {
    const e: Errors = {};
    if (name.trim().split(/\s+/).length < 2) e.name = "Escreva o primeiro e o último nome (ex.: Maria Neto).";
    if (!isEmail(email)) e.email = "Este e-mail não parece correcto. Ex.: nome@exemplo.ao";
    else if (USERS.some((u) => u.email === email.trim().toLowerCase())) e.email = "Já existe uma conta com este e-mail. Experimente entrar.";
    if (!isValidAoPhone(phone)) e.phone = "O número deve ter 9 dígitos e começar por 9 (ex.: 923 000 000).";
    if (password.length < 6) e.password = "A palavra-passe precisa de ter pelo menos 6 caracteres.";
    if (!terms) e.terms = "Para continuar, aceite os termos e a política de privacidade.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function finish(withDetails: boolean) {
    setDone(true);
    const u = register({
      name: name.trim().replace(/\s+/g, " "),
      email: email.trim().toLowerCase(),
      phone: `+244 ${phone}`,
      ...(withDetails
        ? {
            birthDate,
            ...(gender ? { gender } : {}),
            documentType,
            documentNumber: documentNumber.trim().toUpperCase(),
            province,
            club: club.trim() || "Individual",
            ...(tshirt ? { tshirt } : {}),
          }
        : {}),
    });
    toast({
      title: `Bem-vindo(a), ${u.name.split(" ")[0]}!`,
      description: withDetails ? "A sua conta foi criada. Já se pode inscrever nas provas." : "Conta criada. Pode completar os seus dados mais tarde no perfil.",
    });
    router.push(next ?? "/perfil");
  }

  if (ready && user && !done) {
    return (
      <div className="rounded-2xl border border-ink-200 bg-ink-50 p-6 text-center">
        <h1 className="text-2xl font-extrabold text-ink-900">Já tem sessão iniciada</h1>
        <p className="mt-2 text-ink-600">Está a usar a conta de {user.name}.</p>
        <ButtonLink href="/perfil" className="mt-5 w-full">
          Ir para o meu perfil
        </ButtonLink>
      </div>
    );
  }

  const err = (k: keyof Errors) => (errors[k] ? true : undefined);

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Criar conta grátis</h1>
      <p className="mt-2 mb-6 text-ink-600">Demora menos de 1 minuto. Com a conta inscreve-se mais depressa nas provas.</p>
      <Steps step={step} />

      {step === 1 ? (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (validateStep1()) {
              setStep(2);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }
          }}
        >
          {Object.keys(errors).length > 0 && <FormError>Corrija os campos assinalados a vermelho.</FormError>}

          <Field label="Nome completo" htmlFor="name" required error={errors.name} hint="Como aparece no seu BI. Vai aparecer nos resultados.">
            <Input id="name" autoComplete="name" placeholder="Ex.: Maria Neto" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={err("name")} />
          </Field>

          <Field label="E-mail" htmlFor="email" required error={errors.email} hint="Enviamos para aqui a confirmação da inscrição.">
            <Input id="email" type="email" inputMode="email" autoComplete="email" placeholder="nome@exemplo.ao" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={err("email")} />
          </Field>

          <Field label="Telemóvel" htmlFor="phone" required error={errors.phone} hint="Enviamos SMS com o código de pagamento e avisos da prova.">
            <PhoneInput id="phone" value={phone} onChange={setPhone} aria-invalid={err("phone")} />
          </Field>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-ink-800">
              Palavra-passe<span className="ml-0.5 text-brand-600">*</span>
            </label>
            <PasswordInput id="password" autoComplete="new-password" placeholder="Crie uma palavra-passe" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={err("password")} />
            {errors.password ? <p className="text-sm text-red-600">{errors.password}</p> : <PasswordStrength value={password} />}
          </div>

          <div>
            <Checkbox
              checked={terms}
              onChange={(e) => setTerms(e.target.checked)}
              aria-invalid={err("terms")}
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

          <Button type="submit" size="lg" className="w-full">
            Continuar <ArrowRight />
          </Button>

          <p className="text-center text-[15px] text-ink-600">
            Já tem conta?{" "}
            <Link href={next ? `/entrar?next=${encodeURIComponent(next)}` : "/entrar"} className="font-semibold text-brand-700 hover:underline">
              Entrar
            </Link>
          </p>
        </form>
      ) : (
        <form
          className="space-y-5"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            finish(true);
          }}
        >
          <div className="rounded-xl bg-emerald-50 px-4 py-3 text-[15px] text-emerald-800 ring-1 ring-emerald-200">
            <strong>Quase pronto!</strong> Estes dados são pedidos quando se inscreve numa prova. Se preencher agora, poupa tempo depois.
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Data de nascimento" htmlFor="birthDate" hint="Serve para o escalão etário.">
              <Input id="birthDate" type="date" max="2015-12-31" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} />
            </Field>
            <Field label="Sexo" htmlFor="gender">
              <Select id="gender" value={gender} onChange={(e) => setGender(e.target.value as Gender | "")}>
                <option value="">Escolher…</option>
                <option value="F">Feminino</option>
                <option value="M">Masculino</option>
              </Select>
            </Field>
          </div>

          <Field label="Documento de identificação" htmlFor="documentNumber" hint="Pedimos no levantamento do kit para confirmar a sua identidade.">
            <div className="flex gap-2">
              <div className="w-36 shrink-0">
                <Select aria-label="Tipo de documento" value={documentType} onChange={(e) => setDocumentType(e.target.value as User["documentType"])}>
                  <option value="BI">BI</option>
                  <option value="Passaporte">Passaporte</option>
                </Select>
              </div>
              <Input id="documentNumber" placeholder="Nº do documento" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </div>
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Província" htmlFor="province">
              <Select id="province" value={province} onChange={(e) => setProvince(e.target.value)}>
                {PROVINCES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </Field>
            <Field label="Clube ou equipa" htmlFor="club" hint="Deixe vazio se corre sozinho(a).">
              <Input id="club" placeholder="Ex.: Kilamba Runners" value={club} onChange={(e) => setClub(e.target.value)} />
            </Field>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-ink-800">Tamanho de t-shirt</legend>
            <div className="grid grid-cols-6 gap-2">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setTshirt(s)}
                  aria-pressed={tshirt === s}
                  className={cn(
                    "h-12 rounded-xl border text-[15px] font-bold transition-colors",
                    tshirt === s ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-col gap-3 pt-2">
            <Button type="submit" size="lg" className="w-full" disabled={done}>
              <UserPlus /> Criar a minha conta
            </Button>
            <Button variant="outline" size="lg" className="w-full" disabled={done} onClick={() => finish(false)}>
              Fazer isto depois
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)} disabled={done}>
              <ArrowLeft /> Voltar ao passo anterior
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
