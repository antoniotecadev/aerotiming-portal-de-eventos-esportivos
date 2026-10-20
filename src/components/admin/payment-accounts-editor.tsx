"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Landmark, Plus, Save, Smartphone, Trash2, Wallet } from "lucide-react";
import type { PaymentAccounts } from "@/lib/types";
import { clearEventPaymentAccounts, savePaymentAccounts, type PaymentAccountsInput } from "@/server/actions/payments";
import { WhatsAppIcon } from "@/components/layout/social-icons";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";

const local = (v?: string) => (v ? v.replace(/\D/g, "").replace(/^244(?=9\d{8}$)/, "") : "");

function toForm(a: PaymentAccounts | null | undefined): PaymentAccountsInput {
  return {
    whatsapp: local(a?.whatsapp),
    expressPhone: local(a?.multicaixaExpress?.phone),
    expressHolder: a?.multicaixaExpress?.holder ?? "",
    kwikId: a?.kwik?.id ?? "",
    kwikHolder: a?.kwik?.holder ?? "",
    iban: a?.iban?.length ? a.iban : [{ bank: "", holder: "", iban: "" }],
    depositInstructions: a?.depositInstructions ?? "",
    proofDeadlineHours: a?.proofDeadlineHours ?? 72,
  };
}

export function PaymentAccountsEditor({
  isAdmin,
  site,
  events,
}: {
  isAdmin: boolean;
  site: PaymentAccounts;
  events: { id: string; title: string; accounts: PaymentAccounts | null }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [scope, setScope] = useState<string>(isAdmin ? "" : (events[0]?.id ?? ""));
  const current = scope ? events.find((e) => e.id === scope) : null;
  const [f, setF] = useState<PaymentAccountsInput>(toForm(scope ? (current?.accounts ?? site) : site));
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof PaymentAccountsInput>(k: K, v: PaymentAccountsInput[K]) => setF((p) => ({ ...p, [k]: v }));
  const iban = f.iban ?? [];

  const choose = (id: string) => {
    setScope(id);
    const ev = events.find((e) => e.id === id);
    setF(toForm(id ? (ev?.accounts ?? site) : site));
  };

  const save = () =>
    startTransition(async () => {
      const res = await savePaymentAccounts({ eventId: scope || null, accounts: f });
      if (!res.ok) return toast({ title: "Não foi possível guardar", description: res.error, tone: "error" });
      toast({ title: "Contas guardadas", description: scope ? "Os atletas deste evento passam a ver estes dados." : "Usadas em todos os eventos sem contas próprias." });
      router.refresh();
    });

  if (!isAdmin && events.length === 0) return <p className="text-ink-600">Ainda não tem eventos atribuídos.</p>;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <Link href="/admin/pagamentos" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-600 hover:text-ink-900"><ArrowLeft className="size-4" /> Pagamentos</Link>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-ink-900">Contas de recebimento e WhatsApp</h1>
        <p className="text-ink-600">É para aqui que os atletas pagam e enviam o comprovativo. Aparece no fim da inscrição e no perfil do atleta.</p>
      </div>

      <Field label="Que contas quer editar?" htmlFor="scope">
        <Select id="scope" value={scope} onChange={(e) => choose(e.target.value)}>
          {isAdmin && <option value="">Contas da AeroTiming (usadas por omissão)</option>}
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}{e.accounts ? " — contas próprias" : ""}</option>
          ))}
        </Select>
      </Field>
      {scope && !current?.accounts && (
        <p className="rounded-xl bg-sky-50 p-4 text-[15px] text-sky-900 ring-1 ring-sky-200">Este evento usa as contas da AeroTiming. Ao guardar, passa a usar as contas abaixo.</p>
      )}

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><WhatsAppIcon className="size-5 text-[#25D366]" /> WhatsApp para comprovativos</span>} description="Número do organizador que recebe as fotos dos comprovativos." />
        <div className="p-5 sm:p-6">
          <Field label="WhatsApp" htmlFor="wa" hint="9 dígitos, ex.: 923 000 000">
            <Input id="wa" inputMode="tel" value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="923 000 000" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><Smartphone className="size-5 text-brand-600" /> Multicaixa Express e KWiK</span>} />
        <div className="grid gap-5 p-5 sm:grid-cols-2 sm:p-6">
          <Field label="Nº Multicaixa Express" htmlFor="mx"><Input id="mx" inputMode="tel" value={f.expressPhone} onChange={(e) => set("expressPhone", e.target.value)} placeholder="923 000 000" /></Field>
          <Field label="Titular" htmlFor="mxh"><Input id="mxh" value={f.expressHolder} onChange={(e) => set("expressHolder", e.target.value)} /></Field>
          <Field label="Nº / ID KWiK" htmlFor="kw"><Input id="kw" value={f.kwikId} onChange={(e) => set("kwikId", e.target.value)} /></Field>
          <Field label="Titular" htmlFor="kwh"><Input id="kwh" value={f.kwikHolder} onChange={(e) => set("kwikHolder", e.target.value)} /></Field>
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><Landmark className="size-5 text-brand-600" /> Contas bancárias (transferência e depósito)</span>} />
        <div className="space-y-4 p-5 sm:p-6">
          {iban.map((acc, i) => (
            <div key={i} className="grid gap-3 rounded-xl border border-ink-200 p-4 sm:grid-cols-[1fr_1fr_1.6fr_auto] sm:items-end">
              <Field label="Banco" htmlFor={`b${i}`}><Input id={`b${i}`} value={acc.bank} onChange={(e) => set("iban", iban.map((x, j) => (j === i ? { ...x, bank: e.target.value } : x)))} /></Field>
              <Field label="Titular" htmlFor={`h${i}`}><Input id={`h${i}`} value={acc.holder} onChange={(e) => set("iban", iban.map((x, j) => (j === i ? { ...x, holder: e.target.value } : x)))} /></Field>
              <Field label="IBAN" htmlFor={`i${i}`}><Input id={`i${i}`} value={acc.iban} onChange={(e) => set("iban", iban.map((x, j) => (j === i ? { ...x, iban: e.target.value.toUpperCase() } : x)))} placeholder="AO06 …" /></Field>
              <Button variant="ghost" aria-label="Remover conta" onClick={() => set("iban", iban.filter((_, j) => j !== i))}><Trash2 /></Button>
            </div>
          ))}
          {iban.length < 3 && <Button variant="soft" onClick={() => set("iban", [...iban, { bank: "", holder: "", iban: "" }])}><Plus /> Adicionar conta</Button>}
          <Field label="Instruções para depósito (opcional)" htmlFor="dep">
            <Textarea id="dep" value={f.depositInstructions} onChange={(e) => set("depositInstructions", e.target.value)} />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title={<span className="inline-flex items-center gap-2"><Wallet className="size-5 text-brand-600" /> Prazo para pagar</span>} />
        <div className="p-5 sm:p-6">
          <Field label="Horas para pagar e enviar o comprovativo" htmlFor="h" hint="Depois deste prazo, a inscrição expira e a vaga é libertada.">
            <Input id="h" type="number" min={12} max={240} value={String(f.proofDeadlineHours)} onChange={(e) => set("proofDeadlineHours", Number(e.target.value))} />
          </Field>
        </div>
      </Card>

      <div className="flex flex-wrap justify-end gap-3">
        {scope && current?.accounts && (
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await clearEventPaymentAccounts({ eventId: scope });
                if (!res.ok) return toast({ title: "Não foi possível", description: res.error, tone: "error" });
                toast({ title: "O evento volta a usar as contas da AeroTiming" });
                router.refresh();
              })
            }
          >
            Usar as contas da AeroTiming
          </Button>
        )}
        <Button size="lg" onClick={save} disabled={pending}><Save /> {pending ? "A guardar…" : "Guardar"}</Button>
      </div>
    </div>
  );
}
