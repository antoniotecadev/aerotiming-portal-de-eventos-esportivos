"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Building2, CalendarPlus, Check, CheckCircle2, Copy, CreditCard, HeartPulse, Landmark,
  Loader2, Lock, MapPin, Shirt, Smartphone, Ticket, User as UserIcon,
} from "lucide-react";
import type { PaymentMethod, SportsEvent, TShirtSize } from "@/lib/types";
import { PROVINCES, TODAY, currentTier } from "@/lib/data";
import { formatDate, formatDateShort, formatKm, formatKz, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useAuth } from "@/components/auth/auth-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { WhatsAppIcon } from "@/components/layout/social-icons";

const STEPS = [
  { id: 1, label: "Distância", Icon: Ticket },
  { id: 2, label: "Os seus dados", Icon: UserIcon },
  { id: 3, label: "Saúde", Icon: HeartPulse },
  { id: 4, label: "Pagamento", Icon: CreditCard },
] as const;

const SIZES: TShirtSize[] = ["XS", "S", "M", "L", "XL", "XXL"];
const BLOOD = ["Não sei", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const METHODS: { id: PaymentMethod; title: string; text: string; Icon: React.ComponentType<{ className?: string }>; badge?: string }[] = [
  { id: "multicaixa-express", title: "Multicaixa Express", text: "Recebe um pedido na app e aprova. Confirmação imediata.", Icon: Smartphone, badge: "Mais rápido" },
  { id: "referencia", title: "Referência Multicaixa", text: "Pague num ATM ou no Internet Banking com entidade e referência.", Icon: Building2 },
  { id: "transferencia", title: "Transferência bancária", text: "Transfira para o IBAN e envie o comprovativo. Confirmação até 24h.", Icon: Landmark },
];

interface Form {
  name: string;
  gender: "M" | "F" | "";
  birthDate: string;
  documentType: "BI" | "Passaporte";
  documentNumber: string;
  phone: string;
  email: string;
  province: string;
  club: string;
  tshirt: TShirtSize | "";
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  bloodType: string;
  medical: string;
  acceptRules: boolean;
  acceptHealth: boolean;
  method: PaymentMethod;
  mcxPhone: string;
}

const EMPTY: Form = {
  name: "", gender: "", birthDate: "", documentType: "BI", documentNumber: "", phone: "", email: "", province: "", club: "", tshirt: "",
  emergencyName: "", emergencyPhone: "", emergencyRelation: "", bloodType: "Não sei", medical: "", acceptRules: false, acceptHealth: false,
  method: "multicaixa-express", mcxPhone: "",
};

function ageOn(birth: string, on: string) {
  const b = parseDate(birth);
  const d = parseDate(on);
  let a = d.getFullYear() - b.getFullYear();
  if (d.getMonth() < b.getMonth() || (d.getMonth() === b.getMonth() && d.getDate() < b.getDate())) a--;
  return a;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
      <div>
        <p className="text-sm text-ink-500">{label}</p>
        <p className="tabular text-xl font-extrabold tracking-wide text-ink-900">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value.replace(/\s/g, ""));
            setOk(true);
            setTimeout(() => setOk(false), 1800);
          } catch {}
        }}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50"
      >
        {ok ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {ok ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function downloadIcs(event: SportsEvent) {
  const d = event.date.replace(/-/g, "");
  const t = event.startTime.replace(":", "");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//AeroTiming//PT", "BEGIN:VEVENT",
    `UID:${event.slug}@aerotiming.ao`, `DTSTART;TZID=Africa/Luanda:${d}T${t}00`, `DTEND;TZID=Africa/Luanda:${d}T${String(Number(t.slice(0, 2)) + 4).padStart(2, "0")}${t.slice(2)}00`,
    `SUMMARY:${event.title}`, `LOCATION:${event.venue}, ${event.city}`, "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = Object.assign(document.createElement("a"), { href: url, download: `${event.slug}.ics` });
  a.click();
  URL.revokeObjectURL(url);
}

export function RegistrationWizard({ event }: { event: SportsEvent }) {
  const sp = useSearchParams();
  const { user, ready } = useAuth();
  const available = event.distances.filter((d) => d.totalSlots - d.slotsTaken > 0);
  const [step, setStep] = useState(1);
  const [distanceId, setDistanceId] = useState(() => {
    const wanted = sp.get("distancia");
    return available.find((d) => d.id === wanted)?.id ?? (available.length === 1 ? available[0].id : "");
  });
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof Form | "distance", string>>>({});
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState<null | { code: string; bib: string; paid: boolean; reference?: string }>(null);
  const [prefilled, setPrefilled] = useState(false);

  // Preenche automaticamente com os dados da conta
  useEffect(() => {
    if (!ready || !user || prefilled) return;
    setForm((f) => ({
      ...f,
      name: user.name, gender: user.gender, birthDate: user.birthDate, documentType: user.documentType, documentNumber: user.documentNumber,
      phone: user.phone, email: user.email, province: user.province, club: user.club, tshirt: user.tshirt,
      emergencyName: user.emergencyContact.name.replace("—", ""), emergencyPhone: user.emergencyContact.phone.replace("—", ""),
      emergencyRelation: user.emergencyContact.relation.replace("—", ""), bloodType: user.bloodType ?? "Não sei", mcxPhone: user.phone,
    }));
    setPrefilled(true);
  }, [ready, user, prefilled]);

  const distance = event.distances.find((d) => d.id === distanceId);
  const tier = distance ? currentTier(distance) : null;
  const total = tier?.price ?? 0;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const validate = (s: number) => {
    const e: typeof errors = {};
    if (s === 1 && !distanceId) e.distance = "Escolha uma distância para continuar.";
    if (s === 2) {
      if (form.name.trim().split(/\s+/).length < 2) e.name = "Escreva o nome e o apelido (como no BI).";
      if (!form.gender) e.gender = "Escolha o sexo.";
      if (!form.birthDate) e.birthDate = "Indique a data de nascimento.";
      else if (distance && ageOn(form.birthDate, event.date) < distance.minAge) e.birthDate = `Para os ${formatKm(distance.distanceKm)} a idade mínima é ${distance.minAge} anos.`;
      if (form.documentNumber.trim().length < 6) e.documentNumber = form.documentType === "BI" ? "Escreva o número do BI (ex.: 006894121LA042)." : "Escreva o número do passaporte.";
      if (form.phone.replace(/\D/g, "").length < 9) e.phone = "Escreva um número de telemóvel válido (9 dígitos).";
      if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "Este e-mail não parece correcto.";
      if (!form.province) e.province = "Escolha a província.";
      if (!form.tshirt) e.tshirt = "Escolha o tamanho da t-shirt.";
    }
    if (s === 3) {
      if (!form.emergencyName.trim()) e.emergencyName = "Quem devemos contactar em caso de emergência?";
      if (form.emergencyPhone.replace(/\D/g, "").length < 9) e.emergencyPhone = "Escreva o telemóvel do contacto de emergência.";
      if (!form.acceptRules) e.acceptRules = "Precisa de aceitar o regulamento.";
      if (!form.acceptHealth) e.acceptHealth = "Precisa de confirmar a declaração de saúde.";
    }
    if (s === 4 && form.method === "multicaixa-express" && form.mcxPhone.replace(/\D/g, "").length < 9) e.mcxPhone = "Escreva o número associado ao Multicaixa Express.";
    setErrors(e);
    if (Object.keys(e).length) setTimeout(() => document.querySelector("[aria-invalid=true], .text-red-600")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate(step)) return;
    setStep((s) => Math.min(4, s + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const back = () => {
    setStep((s) => Math.max(1, s - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const pay = () => {
    if (!validate(4)) return;
    setPaying(true);
    const n = Math.floor(10000 + Math.random() * 89999);
    setTimeout(() => {
      setPaying(false);
      setDone({
        code: `AT-2026-${n}`,
        bib: String((event.distances.indexOf(distance!) + 1) * 1000 + 100 + (n % 800)),
        paid: form.method === "multicaixa-express",
        reference: form.method === "referencia" ? `${String(n).slice(0, 3)} ${String(n * 7).slice(0, 3)} ${String(n * 13).slice(0, 3)}` : undefined,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1800);
  };

  const summary = (
    <div className="overflow-hidden rounded-3xl border border-ink-200/70 bg-white shadow-card">
      <div className="flex gap-4 border-b border-ink-100 p-4">
        <div className="relative h-24 w-[68px] shrink-0 overflow-hidden rounded-lg bg-ink-100">
          <Image src={event.poster} alt="" fill sizes="68px" className="object-cover" />
        </div>
        <div className="min-w-0">
          <p className="font-bold leading-snug">{event.title}</p>
          <p className="mt-1 text-sm text-ink-500">{formatDateShort(event.date)} · {event.startTime}</p>
          <p className="flex items-center gap-1 text-sm text-ink-500"><MapPin className="size-3.5" /> {event.city}</p>
        </div>
      </div>
      <dl className="space-y-2.5 p-4 text-[15px]">
        <div className="flex justify-between gap-3"><dt className="text-ink-500">Distância</dt><dd className="text-right font-semibold">{distance?.name ?? "—"}</dd></div>
        {form.tshirt && <div className="flex justify-between gap-3"><dt className="text-ink-500">T-shirt</dt><dd className="font-semibold">{form.tshirt}</dd></div>}
        {form.name && step > 2 && <div className="flex justify-between gap-3"><dt className="text-ink-500">Atleta</dt><dd className="truncate text-right font-semibold">{form.name}</dd></div>}
        <div className="flex justify-between gap-3 border-t border-ink-100 pt-3"><dt className="font-bold">Total</dt><dd className="text-xl font-extrabold">{total ? formatKz(total) : "—"}</dd></div>
        {tier && <p className="text-xs text-ink-500">{tier.label} — preço válido até {formatDate(tier.until, false)}</p>}
      </dl>
    </div>
  );

  // ——— Confirmação ———
  if (done) {
    return (
      <div className="container-page max-w-3xl py-10 pb-28 lg:pb-16">
        <div className="rounded-3xl border border-ink-200/70 bg-white p-6 text-center shadow-card sm:p-10">
          <span className={cn("mx-auto flex size-20 items-center justify-center rounded-full", done.paid ? "bg-emerald-100 text-emerald-600" : "bg-amber-100 text-amber-600")}>
            <CheckCircle2 className="size-11" />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">{done.paid ? "Inscrição confirmada!" : "Inscrição registada!"}</h1>
          <p className="mx-auto mt-2 max-w-lg text-lg text-ink-600">
            {done.paid
              ? `Parabéns, ${form.name.split(" ")[0]}! O pagamento foi aprovado. Enviámos a confirmação por SMS${form.email ? " e e-mail" : ""}.`
              : "Falta só o pagamento. A vaga fica reservada durante 48 horas."}
          </p>

          <div className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl bg-ink-50 p-4"><p className="text-sm text-ink-500">Código da inscrição</p><p className="tabular text-xl font-extrabold">{done.code}</p></div>
            <div className="rounded-2xl bg-ink-900 p-4 text-white"><p className="text-sm text-ink-300">O seu dorsal</p><p className="font-display text-3xl leading-tight font-extrabold">{done.paid ? done.bib : "Após o pagamento"}</p></div>
          </div>

          {!done.paid && form.method === "referencia" && (
            <div className="mt-4 space-y-2 rounded-2xl bg-amber-50 p-4 text-left">
              <p className="font-bold text-amber-900">Pague no ATM ou Internet Banking → Pagamentos → Pagamento de serviços</p>
              <CopyField label="Entidade" value="11223" />
              <CopyField label="Referência" value={done.reference!} />
              <CopyField label="Montante" value={formatKz(total)} />
            </div>
          )}
          {!done.paid && form.method === "transferencia" && (
            <div className="mt-4 space-y-2 rounded-2xl bg-amber-50 p-4 text-left">
              <p className="font-bold text-amber-900">Transfira e envie o comprovativo pelo WhatsApp ou na sua área pessoal</p>
              <CopyField label="IBAN (Banco Palanca)" value="AO06 0040 0000 1234 5678 1019 0" />
              <CopyField label="Descritivo" value={done.code} />
            </div>
          )}

          <div className="mt-6 rounded-2xl border border-ink-200 p-4 text-left text-[15px]">
            <p className="font-bold">Levantamento do kit</p>
            <p className="mt-1 text-ink-600">{event.kit.location} — {event.kit.pickup.map((p) => formatDateShort(p.date)).join(", ")}. Leve o BI e o código da inscrição.</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <ButtonLink href={user ? "/perfil/inscricoes" : "/criar-conta"} size="lg"><Ticket /> {user ? "Ver o meu bilhete" : "Criar conta para guardar o bilhete"}</ButtonLink>
            <Button variant="outline" size="lg" onClick={() => downloadIcs(event)}><CalendarPlus /> Adicionar ao calendário</Button>
            <Button variant="outline" size="lg" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`Inscrevi-me na ${event.title}! Junta-te a mim: ${window.location.origin}/eventos/${event.slug}`)}`, "_blank")}>
              <WhatsAppIcon className="size-5 text-[#25D366]" /> Convidar amigos
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6 pb-28 sm:py-10 lg:pb-16">
      <Link href={`/eventos/${event.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900"><ArrowLeft className="size-4" /> Voltar ao evento</Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Inscrição — {event.title}</h1>

      {/* Passos */}
      <ol className="mt-6 grid grid-cols-4 gap-2" aria-label="Passos da inscrição">
        {STEPS.map(({ id, label, Icon }) => {
          const state = id < step ? "done" : id === step ? "current" : "todo";
          return (
            <li key={id} aria-current={state === "current" ? "step" : undefined}>
              <div className={cn("h-1.5 rounded-full", state === "todo" ? "bg-ink-200" : "bg-brand-600")} />
              <div className={cn("mt-2 flex items-center gap-1.5 text-xs font-semibold sm:text-sm", state === "todo" ? "text-ink-400" : "text-ink-900")}>
                <span className={cn("hidden size-6 items-center justify-center rounded-full sm:flex", state === "done" ? "bg-emerald-500 text-white" : state === "current" ? "bg-brand-600 text-white" : "bg-ink-200 text-ink-500")}>
                  {state === "done" ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                </span>
                {label}
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 rounded-3xl border border-ink-200/70 bg-white p-5 shadow-card sm:p-8">
          {ready && !user && step <= 2 && (
            <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-sky-50 p-4 text-sky-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px]"><strong>Já tem conta?</strong> Entre e preenchemos os seus dados automaticamente.</p>
              <ButtonLink href={`/entrar?next=/eventos/${event.slug}/inscricao`} variant="white" size="sm">Entrar</ButtonLink>
            </div>
          )}

          {step === 1 && (
            <fieldset>
              <legend className="text-xl font-bold">Que distância quer fazer?</legend>
              <p className="mt-1 text-ink-600">Toque numa opção. Pode ver o percurso de cada distância na página do evento.</p>
              <div className="mt-5 grid gap-3">
                {event.distances.map((d) => {
                  const left = d.totalSlots - d.slotsTaken;
                  const soldOut = left <= 0;
                  const selected = d.id === distanceId;
                  return (
                    <label key={d.id} className={cn("flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4 transition-colors", soldOut ? "cursor-not-allowed border-ink-100 opacity-50" : selected ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-ink-300")}>
                      <input type="radio" name="distance" className="sr-only" disabled={soldOut} checked={selected} onChange={() => { setDistanceId(d.id); setErrors({}); }} />
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300")}>{selected && <Check className="size-3.5" />}</span>
                      <span className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-ink-900 text-white">
                        <span className="font-display text-xl leading-none font-extrabold">{Math.round(d.distanceKm)}</span>
                        <span className="text-[10px] font-bold uppercase">km</span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-bold">{d.name}</span>
                        <span className="block text-sm text-ink-500">Partida {d.startTime} · {d.minAge ? `a partir dos ${d.minAge} anos` : "todas as idades"}</span>
                        <span className={cn("text-sm font-semibold", soldOut ? "text-red-600" : left < 300 ? "text-amber-700" : "text-emerald-700")}>{soldOut ? "Esgotado" : `${left} vagas disponíveis`}</span>
                      </span>
                      <span className="text-right text-lg font-extrabold whitespace-nowrap">{formatKz(currentTier(d).price)}</span>
                    </label>
                  );
                })}
              </div>
              {errors.distance && <p className="mt-3 text-sm font-semibold text-red-600">{errors.distance}</p>}
            </fieldset>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Os dados do atleta</h2>
                <p className="mt-1 text-ink-600">Escreva tal como está no BI ou passaporte. Vai precisar dele para levantar o kit.</p>
              </div>
              <Field label="Nome completo" htmlFor="name" required error={errors.name}>
                <Input id="name" autoComplete="name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ex.: Maria da Conceição Neto" aria-invalid={!!errors.name} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Sexo" required error={errors.gender}>
                  <div className="grid grid-cols-2 gap-2">
                    {(["M", "F"] as const).map((g) => (
                      <button key={g} type="button" onClick={() => set("gender", g)} className={cn("h-12 rounded-xl border-2 font-semibold", form.gender === g ? "border-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-700 hover:border-ink-300")}>
                        {g === "M" ? "Masculino" : "Feminino"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Data de nascimento" htmlFor="birth" required error={errors.birthDate} hint="Usada para o escalão etário.">
                  <Input id="birth" type="date" max={TODAY} value={form.birthDate} onChange={(e) => set("birthDate", e.target.value)} aria-invalid={!!errors.birthDate} />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
                <Field label="Documento" htmlFor="doctype">
                  <Select id="doctype" value={form.documentType} onChange={(e) => set("documentType", e.target.value as Form["documentType"])}>
                    <option value="BI">BI</option>
                    <option value="Passaporte">Passaporte</option>
                  </Select>
                </Field>
                <Field label={`Número do ${form.documentType}`} htmlFor="docnum" required error={errors.documentNumber}>
                  <Input id="docnum" value={form.documentNumber} onChange={(e) => set("documentNumber", e.target.value.toUpperCase())} placeholder={form.documentType === "BI" ? "006894121LA042" : "N1234567"} aria-invalid={!!errors.documentNumber} />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Telemóvel" htmlFor="phone" required error={errors.phone} hint="Enviamos a confirmação por SMS.">
                  <div className="flex">
                    <span className="flex h-12 items-center rounded-l-xl border border-r-0 border-ink-200 bg-ink-50 px-3 font-semibold text-ink-600">+244</span>
                    <Input id="phone" type="tel" inputMode="tel" autoComplete="tel" className="rounded-l-none" value={form.phone.replace(/^\+244\s?/, "")} onChange={(e) => set("phone", e.target.value)} placeholder="923 000 000" aria-invalid={!!errors.phone} />
                  </div>
                </Field>
                <Field label="E-mail (opcional)" htmlFor="email" error={errors.email}>
                  <Input id="email" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="nome@exemplo.ao" aria-invalid={!!errors.email} />
                </Field>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Província onde vive" htmlFor="prov" required error={errors.province}>
                  <Select id="prov" value={form.province} onChange={(e) => set("province", e.target.value)} aria-invalid={!!errors.province}>
                    <option value="">Escolher…</option>
                    {PROVINCES.map((p) => <option key={p}>{p}</option>)}
                  </Select>
                </Field>
                <Field label="Clube ou equipa (opcional)" htmlFor="club" hint="Deixe em branco se corre sozinho.">
                  <Input id="club" value={form.club === "Individual" ? "" : form.club} onChange={(e) => set("club", e.target.value)} placeholder="Ex.: Kilamba Runners" />
                </Field>
              </div>
              <Field label="Tamanho da t-shirt" required error={errors.tshirt}>
                <div className="grid grid-cols-6 gap-2">
                  {SIZES.map((s) => (
                    <button key={s} type="button" onClick={() => set("tshirt", s)} className={cn("flex h-12 flex-col items-center justify-center rounded-xl border-2 text-sm font-bold", form.tshirt === s ? "border-brand-500 bg-brand-50 text-brand-800" : "border-ink-200 text-ink-700 hover:border-ink-300")} aria-pressed={form.tshirt === s}>
                      {s}
                    </button>
                  ))}
                </div>
                <p className="flex items-center gap-1.5 text-sm text-ink-500"><Shirt className="size-4" /> Na dúvida, escolha um tamanho acima.</p>
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Saúde e contacto de emergência</h2>
                <p className="mt-1 text-ink-600">Só é usado pela equipa médica se precisar de ajuda durante a prova.</p>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Nome do contacto de emergência" htmlFor="ename" required error={errors.emergencyName}>
                  <Input id="ename" value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} placeholder="Ex.: Helena Mendonça" aria-invalid={!!errors.emergencyName} />
                </Field>
                <Field label="Telemóvel do contacto" htmlFor="ephone" required error={errors.emergencyPhone}>
                  <Input id="ephone" type="tel" inputMode="tel" value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} placeholder="+244 912 000 000" aria-invalid={!!errors.emergencyPhone} />
                </Field>
                <Field label="Relação (opcional)" htmlFor="erel">
                  <Input id="erel" value={form.emergencyRelation} onChange={(e) => set("emergencyRelation", e.target.value)} placeholder="Ex.: Mãe, irmão, esposa" />
                </Field>
                <Field label="Grupo sanguíneo" htmlFor="blood">
                  <Select id="blood" value={form.bloodType} onChange={(e) => set("bloodType", e.target.value)}>
                    {BLOOD.map((b) => <option key={b}>{b}</option>)}
                  </Select>
                </Field>
              </div>
              <Field label="Alergias, doenças ou medicação (opcional)" htmlFor="med">
                <Textarea id="med" value={form.medical} onChange={(e) => set("medical", e.target.value)} placeholder="Ex.: asma, alergia à penicilina…" />
              </Field>
              <div className="space-y-3 rounded-2xl bg-ink-50 p-4">
                <Checkbox
                  checked={form.acceptRules}
                  onChange={(e) => set("acceptRules", e.target.checked)}
                  label={<>Li e aceito o <Link href={`/eventos/${event.slug}#regulamento`} target="_blank" className="font-semibold text-brand-700 underline">regulamento da prova</Link> e os <Link href="/termos" target="_blank" className="font-semibold text-brand-700 underline">termos de uso</Link>.</>}
                />
                {errors.acceptRules && <p className="pl-8 text-sm text-red-600">{errors.acceptRules}</p>}
                <Checkbox checked={form.acceptHealth} onChange={(e) => set("acceptHealth", e.target.checked)} label="Declaro que estou em boas condições de saúde para participar e assumo a responsabilidade pela minha participação." />
                {errors.acceptHealth && <p className="pl-8 text-sm text-red-600">{errors.acceptHealth}</p>}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold">Como quer pagar?</h2>
                <p className="mt-1 text-ink-600">Total a pagar: <strong className="text-ink-900">{formatKz(total)}</strong></p>
              </div>
              <div className="grid gap-3">
                {METHODS.map(({ id, title, text, Icon, badge }) => {
                  const selected = form.method === id;
                  return (
                    <label key={id} className={cn("flex cursor-pointer items-center gap-4 rounded-2xl border-2 p-4", selected ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-ink-300")}>
                      <input type="radio" name="method" className="sr-only" checked={selected} onChange={() => set("method", id)} />
                      <span className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", selected ? "bg-brand-600 text-white" : "bg-ink-100 text-ink-600")}><Icon className="size-6" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2 font-bold">{title}{badge && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">{badge}</span>}</span>
                        <span className="block text-sm text-ink-600">{text}</span>
                      </span>
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-full border-2", selected ? "border-brand-600 bg-brand-600 text-white" : "border-ink-300")}>{selected && <Check className="size-3.5" />}</span>
                    </label>
                  );
                })}
              </div>
              {form.method === "multicaixa-express" && (
                <Field label="Número de telemóvel do Multicaixa Express" htmlFor="mcx" error={errors.mcxPhone} hint="Vai receber uma notificação na app para aprovar o pagamento.">
                  <Input id="mcx" type="tel" inputMode="tel" value={form.mcxPhone} onChange={(e) => set("mcxPhone", e.target.value)} placeholder="923 000 000" aria-invalid={!!errors.mcxPhone} />
                </Field>
              )}
              {form.method === "referencia" && <p className="rounded-xl bg-ink-50 p-4 text-[15px] text-ink-700">No próximo passo mostramos a <strong>entidade</strong> e a <strong>referência</strong>. Tem 48 horas para pagar num ATM ou no Internet Banking.</p>}
              {form.method === "transferencia" && <p className="rounded-xl bg-ink-50 p-4 text-[15px] text-ink-700">No próximo passo mostramos o <strong>IBAN</strong>. Depois de transferir, envie o comprovativo. A confirmação pode demorar até 24 horas.</p>}
              <p className="flex items-center gap-2 text-sm text-ink-500"><Lock className="size-4 text-emerald-600" /> Os seus dados estão protegidos (Lei n.º 22/11 de Protecção de Dados Pessoais).</p>
            </div>
          )}

          {/* Botões de navegação */}
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-ink-100 pt-6 sm:flex-row sm:justify-between">
            {step > 1 ? <Button variant="ghost" size="lg" onClick={back}><ArrowLeft /> Voltar</Button> : <span />}
            {step < 4 ? (
              <Button size="lg" onClick={next} className="sm:min-w-48">Continuar <ArrowRight /></Button>
            ) : (
              <Button size="lg" onClick={pay} disabled={paying} className="sm:min-w-56">
                {paying ? <><Loader2 className="animate-spin" /> A processar…</> : form.method === "multicaixa-express" ? <>Pagar {formatKz(total)}</> : <>Confirmar inscrição</>}
              </Button>
            )}
          </div>
        </div>

        <aside className="order-first lg:order-none">
          <div className="lg:sticky lg:top-24">{summary}</div>
        </aside>
      </div>
    </div>
  );
}
