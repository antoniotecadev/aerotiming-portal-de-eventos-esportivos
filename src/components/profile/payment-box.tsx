"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatDateTime, formatKz } from "@/lib/format";
import type { Registration } from "@/lib/types";
import { cn } from "@/lib/utils";

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value.replace(/\s/g, ""));
        } catch {}
        setCopied(true);
        toast({ title: `${label} copiada`, description: value, tone: "info" });
        setTimeout(() => setCopied(false), 2000);
      }}
      className={cn(
        "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
        copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "border-ink-200 bg-white text-ink-700 hover:bg-ink-50",
        className,
      )}
      aria-label={`Copiar ${label.toLowerCase()}`}
    >
      {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

function Row({ label, value, copyLabel, big }: { label: string; value: string; copyLabel?: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-ink-200/70">
      <div className="min-w-0">
        <p className="text-xs font-semibold tracking-wide text-ink-500 uppercase">{label}</p>
        <p className={cn("font-mono font-bold text-ink-900 tabular", big ? "text-2xl" : "text-xl")}>{value}</p>
      </div>
      {copyLabel && <CopyButton value={value} label={copyLabel} />}
    </div>
  );
}

/** Dados para pagar no ATM / Multicaixa Express / Internet banking. */
export function PaymentBox({ payment, className }: { payment: Registration["payment"]; className?: string }) {
  const entity = payment.entity ?? "11223";
  const reference = payment.reference ?? "—";
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid gap-2">
        <Row label="Entidade" value={entity} copyLabel="Entidade" />
        <Row label="Referência" value={reference} copyLabel="Referência" />
        <Row label="Montante" value={formatKz(payment.amount)} big />
      </div>
      {payment.expiresAt && (
        <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm text-amber-900 ring-1 ring-amber-200">
          Pague até <strong>{formatDateTime(payment.expiresAt)}</strong>. Depois disso a vaga é libertada.
        </p>
      )}
      <ol className="space-y-1.5 text-[15px] text-ink-700">
        <li>
          <strong>1.</strong> No ATM, Multicaixa Express ou Internet banking escolha <strong>Pagamentos → Pagamento por referência</strong>.
        </li>
        <li>
          <strong>2.</strong> Escreva a <strong>entidade</strong>, a <strong>referência</strong> e o <strong>montante</strong> exactos.
        </li>
        <li>
          <strong>3.</strong> Guarde o talão. A inscrição fica confirmada em poucos minutos e recebe um SMS.
        </li>
      </ol>
    </div>
  );
}
