"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BadgeCheck, Banknote, CheckCircle2, Download, Inbox, Search, Settings2, XCircle } from "lucide-react";
import type { PanelPayment, PanelTab } from "@/server/queries/payments";
import { confirmPayment, exportPaymentsCsv, markProofReceived, rejectPayment } from "@/server/actions/payments";
import { PAYMENT_METHOD, formatDateTime, formatKz } from "@/lib/format";
import type { PaymentMethod } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { WhatsAppIcon } from "@/components/layout/social-icons";

const STATUS: Record<string, { label: string; tone: "amber" | "blue" | "green" | "red" | "gray" }> = {
  pendente: { label: "Por pagar", tone: "amber" },
  em_analise: { label: "Comprovativo recebido", tone: "blue" },
  confirmado: { label: "Confirmado", tone: "green" },
  rejeitado: { label: "Rejeitado", tone: "red" },
  expirado: { label: "Expirado", tone: "gray" },
  cancelado: { label: "Cancelado", tone: "gray" },
  reembolsado: { label: "Reembolsado", tone: "gray" },
};

const waLink = (phone: string, text: string) => `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;

export function PaymentsPanel({
  events,
  rows,
  counts,
  tab,
  eventId,
  q,
}: {
  events: { id: string; title: string; date: string }[];
  rows: PanelPayment[];
  counts: Record<PanelTab, number>;
  tab: PanelTab;
  eventId: string;
  q: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(q);
  const [confirming, setConfirming] = useState<PanelPayment | null>(null);
  const [rejecting, setRejecting] = useState<PanelPayment | null>(null);
  const [txRef, setTxRef] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [modalError, setModalError] = useState<{ text: string; duplicate?: boolean } | null>(null);

  const setParam = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams(sp.toString());
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    router.push(`${pathname}${next.size ? `?${next}` : ""}`);
  };

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, success: string, after?: () => void) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return toast({ title: "Não foi possível", description: res.error, tone: "error" });
      toast({ title: success });
      after?.();
      router.refresh();
    });

  const doConfirm = (force = false) => {
    if (!confirming) return;
    setModalError(null);
    startTransition(async () => {
      const res = await confirmPayment({ paymentId: confirming.id, transactionRef: txRef, note, force });
      if (!res.ok) return setModalError({ text: res.error, duplicate: !!res.duplicateOf });
      toast({ title: "Pagamento confirmado", description: `${confirming.athleteName} · dorsal ${res.bib}` });
      setConfirming(null);
      router.refresh();
    });
  };

  const doExport = () =>
    startTransition(async () => {
      if (!eventId) return toast({ title: "Escolha um evento", description: "A exportação é feita por evento.", tone: "info" });
      const res = await exportPaymentsCsv({ eventId });
      if (!res.ok) return toast({ title: "Não foi possível exportar", description: res.error, tone: "error" });
      const url = URL.createObjectURL(new Blob([res.csv], { type: "text/csv;charset=utf-8" }));
      Object.assign(document.createElement("a"), { href: url, download: res.filename }).click();
      URL.revokeObjectURL(url);
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Pagamentos</h1>
          <p className="text-ink-600">Os atletas enviam o comprovativo pelo WhatsApp. Confira o valor e o código e confirme aqui — o dorsal é atribuído na hora.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/admin/pagamentos/contas" variant="outline"><Settings2 /> Contas e WhatsApp</ButtonLink>
          <Button variant="outline" onClick={doExport} disabled={pending}><Download /> Exportar CSV</Button>
        </div>
      </div>

      <div className="grid gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:grid-cols-[1fr_1.4fr]">
        <Select aria-label="Evento" value={eventId} onChange={(e) => setParam({ evento: e.target.value || null })}>
          <option value="">Todos os meus eventos</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </Select>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setParam({ q: search.trim() || null });
          }}
        >
          <label className="flex h-12 flex-1 items-center gap-2 rounded-xl border border-ink-200 px-3.5 focus-within:border-brand-500">
            <Search className="size-5 text-ink-400" />
            <span className="sr-only">Procurar</span>
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Código, nome, telemóvel ou dorsal" className="h-full w-full bg-transparent focus:outline-none" />
          </label>
          <Button type="submit" variant="dark" className="h-12">Procurar</Button>
        </form>
      </div>

      <Tabs<PanelTab>
        value={tab}
        onChange={(t) => setParam({ estado: t === "por-confirmar" ? null : t })}
        items={[
          { id: "por-confirmar", label: "Por confirmar", count: counts["por-confirmar"] },
          { id: "rejeitados", label: "Rejeitados", count: counts.rejeitados },
          { id: "confirmados", label: "Confirmados", count: counts.confirmados },
          { id: "todos", label: "Todos", count: counts.todos },
        ]}
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={tab === "por-confirmar" ? "Nada por confirmar" : "Sem pagamentos"}
          description={tab === "por-confirmar" ? "Quando um atleta se inscrever, o pagamento aparece aqui até ser confirmado." : "Não há pagamentos com estes filtros."}
        />
      ) : (
        <ul className="grid gap-3">
          {rows.map((p) => {
            const st = STATUS[p.status];
            const open = p.status === "pendente" || p.status === "em_analise" || p.status === "rejeitado";
            return (
              <li key={p.id} className={cn("rounded-2xl border bg-white p-4 shadow-card sm:p-5", p.status === "em_analise" ? "border-sky-300" : "border-ink-200/70")}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={st.tone} dot>{st.label}</Badge>
                      <span className="tabular text-sm font-bold text-ink-900">{p.code}</span>
                      {p.bib && <span className="rounded-md bg-ink-900 px-2 py-0.5 text-xs font-bold text-white">Dorsal {p.bib}</span>}
                    </div>
                    <p className="mt-2 text-lg font-bold text-ink-900">{p.athleteName}</p>
                    <p className="text-sm text-ink-600">{p.eventTitle} · {p.distanceName}</p>
                    <p className="mt-1 text-sm text-ink-500">
                      Inscrito a {formatDateTime(p.createdAt)}
                      {p.status === "pendente" && p.expiresAt && <> · prazo até {formatDateTime(p.expiresAt)}</>}
                      {p.confirmedAt && <> · confirmado a {formatDateTime(p.confirmedAt)}</>}
                      {p.transactionRef && <> · operação {p.transactionRef}</>}
                    </p>
                    {p.reviewNote && <p className="mt-1 text-sm text-red-700">Motivo: {p.reviewNote}</p>}
                  </div>
                  <div className="shrink-0 text-left lg:text-right">
                    <p className="text-2xl font-extrabold text-ink-900">{formatKz(p.amount)}</p>
                    <p className="text-sm text-ink-500">{PAYMENT_METHOD[p.method.replace(/_/g, "-") as PaymentMethod]}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                  {open && (
                    <Button onClick={() => { setConfirming(p); setTxRef(""); setNote(""); setModalError(null); }} className="bg-emerald-600 hover:bg-emerald-700">
                      <BadgeCheck /> Confirmar pagamento
                    </Button>
                  )}
                  {(p.status === "pendente" || p.status === "rejeitado") && (
                    <Button variant="outline" disabled={pending} onClick={() => run(() => markProofReceived({ paymentId: p.id }), "Marcado: comprovativo recebido")}>
                      <Banknote /> Recebi o comprovativo
                    </Button>
                  )}
                  {(p.status === "pendente" || p.status === "em_analise") && (
                    <Button variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => { setRejecting(p); setReason(""); }}>
                      <XCircle /> Rejeitar
                    </Button>
                  )}
                  <a
                    href={waLink(p.phone, `Olá ${p.athleteName.split(" ")[0]}! Sobre a sua inscrição ${p.code} (${p.eventTitle}):`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-ink-700 hover:bg-ink-100"
                  >
                    <WhatsAppIcon className="size-5 text-[#25D366]" /> Falar com o atleta
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {rows.length === 300 && <p className="text-center text-sm text-ink-500">A mostrar os primeiros 300. Escolha um evento ou procure para ver menos resultados.</p>}

      <Modal
        open={!!confirming}
        onClose={() => setConfirming(null)}
        title="Confirmar pagamento"
        description={confirming ? `${confirming.code} · ${confirming.athleteName}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirming(null)}>Voltar</Button>
            {modalError?.duplicate ? (
              <Button variant="danger" disabled={pending} onClick={() => doConfirm(true)}>Confirmar mesmo assim</Button>
            ) : (
              <Button className="bg-emerald-600 hover:bg-emerald-700" disabled={pending} onClick={() => doConfirm()}><CheckCircle2 /> Confirmar</Button>
            )}
          </>
        }
      >
        {confirming && (
          <div className="space-y-4 p-5 sm:p-6">
            <div className="rounded-xl bg-ink-50 p-4 text-[15px]">
              <p>Antes de confirmar, verifique no comprovativo que recebeu pelo WhatsApp:</p>
              <ul className="mt-2 space-y-1">
                <li>✔ Valor: <strong>{formatKz(confirming.amount)}</strong></li>
                <li>✔ Código no descritivo: <strong>{confirming.code}</strong></li>
                <li>✔ O dinheiro entrou mesmo na conta</li>
              </ul>
            </div>
            <Field label="Nº da operação / referência do comprovativo (opcional)" htmlFor="txref" hint="Ajuda a detectar o mesmo comprovativo usado duas vezes.">
              <Input id="txref" value={txRef} onChange={(e) => setTxRef(e.target.value)} placeholder="Ex.: 0021456789" />
            </Field>
            <Field label="Nota interna (opcional)" htmlFor="note">
              <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: pago por familiar" />
            </Field>
            {modalError && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{modalError.text}</p>}
          </div>
        )}
      </Modal>

      <Modal
        open={!!rejecting}
        onClose={() => setRejecting(null)}
        size="sm"
        title="Rejeitar pagamento"
        description={rejecting ? `${rejecting.code} · ${rejecting.athleteName}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setRejecting(null)}>Voltar</Button>
            <Button
              variant="danger"
              disabled={pending}
              onClick={() => rejecting && run(() => rejectPayment({ paymentId: rejecting.id, reason }), "Pagamento rejeitado", () => setRejecting(null))}
            >
              <XCircle /> Rejeitar
            </Button>
          </>
        }
      >
        <div className="space-y-3 p-5 sm:p-6">
          <p className="text-[15px] text-ink-700">O atleta vê o motivo no perfil e pode pagar de novo dentro do novo prazo.</p>
          <Field label="Motivo" htmlFor="reason" required>
            <Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: valor transferido não corresponde (faltam 2.000 Kz)" />
          </Field>
        </div>
      </Modal>

      <p className="text-sm text-ink-500">
        As inscrições <strong>por pagar</strong> expiram no fim do prazo e a vaga é libertada. Use <em>“Recebi o comprovativo”</em> para parar o prazo enquanto confirma. <Link href="/admin/pagamentos/contas" className="font-semibold text-brand-700 hover:underline">Definir contas e WhatsApp</Link>
      </p>
    </div>
  );
}
