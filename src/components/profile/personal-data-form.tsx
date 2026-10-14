"use client";

import { useState } from "react";
import { HeartPulse, IdCard, Save, Shirt, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { PhoneInput, isValidAoPhone, stripPrefix } from "@/components/auth/phone-input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { PROVINCES } from "@/lib/data";
import type { Gender, TShirtSize, User } from "@/lib/types";
import { cn } from "@/lib/utils";

const SIZES: TShirtSize[] = ["XS", "S", "M", "L", "XL", "XXL"];
const BLOOD = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const RELATIONS = ["Pai", "Mãe", "Esposo(a)", "Esposa", "Marido", "Filho(a)", "Irmão(ã)", "Amigo(a)", "Outro"];
const clean = (v: string) => (v === "—" ? "" : v);

function Form({ user }: { user: User }) {
  const { updateUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({
    name: user.name,
    email: user.email,
    phone: stripPrefix(user.phone),
    birthDate: user.birthDate,
    gender: user.gender,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    province: user.province,
    city: clean(user.city),
    club: clean(user.club),
    tshirt: user.tshirt,
    bloodType: user.bloodType ?? "",
    ecName: clean(user.emergencyContact?.name ?? ""),
    ecPhone: stripPrefix(clean(user.emergencyContact?.phone ?? "")),
    ecRelation: clean(user.emergencyContact?.relation ?? ""),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const err: Record<string, string> = {};
    if (f.name.trim().split(/\s+/).length < 2) err.name = "Escreva o primeiro e o último nome.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) err.email = "Este e-mail não parece correcto.";
    if (!isValidAoPhone(f.phone)) err.phone = "9 dígitos, a começar por 9.";
    if (f.ecPhone && !isValidAoPhone(f.ecPhone)) err.ecPhone = "9 dígitos, a começar por 9.";
    setErrors(err);
    if (Object.keys(err).length) {
      toast({ title: "Verifique os campos assinalados", description: "Há dados por corrigir.", tone: "error" });
      return;
    }
    updateUser({
      name: f.name.trim().replace(/\s+/g, " "),
      email: f.email.trim().toLowerCase(),
      phone: `+244 ${f.phone}`,
      birthDate: f.birthDate,
      gender: f.gender,
      documentType: f.documentType,
      documentNumber: f.documentNumber.trim().toUpperCase(),
      province: f.province,
      city: f.city.trim(),
      club: f.club.trim() || "Individual",
      tshirt: f.tshirt,
      bloodType: f.bloodType || undefined,
      emergencyContact: { name: f.ecName.trim(), phone: f.ecPhone ? `+244 ${f.ecPhone}` : "", relation: f.ecRelation },
    });
    toast({ title: "Dados guardados", description: "As suas alterações foram guardadas com sucesso." });
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Os meus dados</h2>
        <p className="text-ink-600">Estes dados são usados para preencher as suas inscrições automaticamente.</p>
      </div>

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><UserRound className="size-5 text-brand-600" /> Dados pessoais</span>} />
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Nome completo" htmlFor="name" required error={errors.name} className="sm:col-span-2" hint="Como aparece no BI. É este nome que aparece nos resultados.">
            <Input id="name" autoComplete="name" value={f.name} onChange={(e) => set("name", e.target.value)} aria-invalid={!!errors.name || undefined} />
          </Field>
          <Field label="E-mail" htmlFor="email" required error={errors.email}>
            <Input id="email" type="email" autoComplete="email" value={f.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email || undefined} />
          </Field>
          <Field label="Telemóvel" htmlFor="phone" required error={errors.phone}>
            <PhoneInput id="phone" value={f.phone} onChange={(v) => set("phone", v)} aria-invalid={!!errors.phone || undefined} />
          </Field>
          <Field label="Data de nascimento" htmlFor="birthDate" hint="Define o seu escalão etário.">
            <Input id="birthDate" type="date" value={f.birthDate} onChange={(e) => set("birthDate", e.target.value)} />
          </Field>
          <Field label="Sexo" htmlFor="gender">
            <Select id="gender" value={f.gender} onChange={(e) => set("gender", e.target.value as Gender)}>
              <option value="F">Feminino</option>
              <option value="M">Masculino</option>
            </Select>
          </Field>
          <Field label="Província" htmlFor="province">
            <Select id="province" value={f.province} onChange={(e) => set("province", e.target.value)}>
              {PROVINCES.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
          <Field label="Cidade / município" htmlFor="city">
            <Input id="city" placeholder="Ex.: Kilamba" value={f.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-2"><IdCard className="size-5 text-brand-600" /> Documento e clube</span>}
          description="O documento é pedido no levantamento do kit."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Documento de identificação" htmlFor="documentNumber" className="sm:col-span-2">
            <div className="flex gap-2">
              <div className="w-36 shrink-0">
                <Select aria-label="Tipo de documento" value={f.documentType} onChange={(e) => set("documentType", e.target.value as User["documentType"])}>
                  <option value="BI">BI</option>
                  <option value="Passaporte">Passaporte</option>
                </Select>
              </div>
              <Input id="documentNumber" placeholder="Nº do documento" value={f.documentNumber} onChange={(e) => set("documentNumber", e.target.value)} />
            </div>
          </Field>
          <Field label="Clube ou equipa" htmlFor="club" hint="Deixe vazio se corre sozinho(a).">
            <Input id="club" placeholder="Ex.: Kilamba Runners" value={f.club} onChange={(e) => set("club", e.target.value)} />
          </Field>
          <fieldset>
            <legend className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-ink-800">
              <Shirt className="size-4 text-ink-500" /> Tamanho de t-shirt
            </legend>
            <div className="grid grid-cols-6 gap-1.5">
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => set("tshirt", s)}
                  aria-pressed={f.tshirt === s}
                  className={cn(
                    "h-12 rounded-xl border text-sm font-bold transition-colors",
                    f.tshirt === s ? "border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={<span className="inline-flex items-center gap-2"><HeartPulse className="size-5 text-red-500" /> Saúde e emergência</span>}
          description="Só é usado pela equipa médica, em caso de necessidade durante a prova."
        />
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Grupo sanguíneo" htmlFor="bloodType" hint="Se não sabe, deixe em branco.">
            <Select id="bloodType" value={f.bloodType} onChange={(e) => set("bloodType", e.target.value)}>
              <option value="">Não sei / prefiro não dizer</option>
              {BLOOD.map((b) => (
                <option key={b}>{b}</option>
              ))}
            </Select>
          </Field>
          <div className="hidden sm:block" />
          <Field label="Nome do contacto de emergência" htmlFor="ecName" hint="Uma pessoa que possamos chamar se precisar.">
            <Input id="ecName" placeholder="Ex.: Helena Mendonça" value={f.ecName} onChange={(e) => set("ecName", e.target.value)} />
          </Field>
          <Field label="Relação" htmlFor="ecRelation">
            <Select id="ecRelation" value={f.ecRelation} onChange={(e) => set("ecRelation", e.target.value)}>
              <option value="">Escolher…</option>
              {[...new Set([...(f.ecRelation && !RELATIONS.includes(f.ecRelation) ? [f.ecRelation] : []), ...RELATIONS])].map((r) => (
                <option key={r}>{r}</option>
              ))}
            </Select>
          </Field>
          <Field label="Telemóvel do contacto de emergência" htmlFor="ecPhone" error={errors.ecPhone}>
            <PhoneInput id="ecPhone" value={f.ecPhone} onChange={(v) => set("ecPhone", v)} aria-invalid={!!errors.ecPhone || undefined} />
          </Field>
        </div>
      </Card>

      <div className="sticky bottom-20 z-20 flex justify-end sm:bottom-4">
        <Button type="submit" size="lg" className="w-full shadow-lift sm:w-auto">
          <Save /> Guardar alterações
        </Button>
      </div>
    </form>
  );
}

export function PersonalDataForm() {
  const { user } = useAuth();
  if (!user) return null;
  return <Form key={user.id} user={user} />;
}
