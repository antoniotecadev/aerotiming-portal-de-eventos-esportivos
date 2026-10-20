"use client";

import { useState } from "react";
import { Check, Clock, Copy, Info } from "lucide-react";
import type { PaymentAccounts, PaymentMethod } from "@/lib/types";
import { PAYMENT_METHOD, formatDateTime, formatKz } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CopyField({ label, value, big }: { label: string; value: string; big?: boolean }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 shadow-sm">
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        <p className={cn("tabular font-extrabold tracking-wide break-all text-ink-900", big ? "text-2xl" : "text-lg")}>{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setOk(true);
            setTimeout(() => setOk(false), 1800);
          } catch {}
        }}
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 px-3 text-sm font-semibold text-ink-700 hover:bg-ink-50"
        aria-label={`Copiar ${label}`}
      >
        {ok ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />} {ok ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

const STEPS: Record<PaymentMethod, string[]> = {
  "multicaixa-express": ["Abra a app Multicaixa Express.", "Escolha “Transferir” para o número indicado abaixo.", "Escreva o código da inscrição na descrição."],
  transferencia: ["Entre no Internet Banking ou na app do seu banco.", "Faça uma transferência para o IBAN indicado abaixo.", "Escreva o código da inscrição no descritivo."],
  deposito: ["Vá a um balcão do banco indicado.", "Deposite o valor no IBAN abaixo.", "Peça para escrever o código da inscrição no talão."],
  kwik: ["Abra a app KWiK.", "Envie o valor para o número indicado abaixo.", "Escreva o código da inscrição na mensagem."],
};

/** Instruções de pagamento manual (D1): para onde pagar e o que escrever no descritivo. */
export function PaymentInstructions({
  method,
  amount,
  code,
  accounts,
  expiresAt,
  className,
}: {
  method: PaymentMethod;
  amount: number;
  code: string;
  accounts: PaymentAccounts;
  expiresAt?: string;
  className?: string;
}) {
  const iban = accounts.iban[0];
  return (
    <div className={cn("space-y-3 rounded-2xl bg-amber-50 p-4 text-left ring-1 ring-amber-200", className)}>
      <p className="font-bold text-amber-900">Como pagar — {PAYMENT_METHOD[method]}</p>
      <ol className="space-y-1 text-[15px] text-amber-950">
        {STEPS[method].map((s, i) => (
          <li key={s}>
            <strong>{i + 1}.</strong> {s}
          </li>
        ))}
      </ol>
      <CopyField label="Valor a pagar" value={formatKz(amount)} big />
      <CopyField label="Código para o descritivo" value={code} />
      {method === "multicaixa-express" && accounts.multicaixaExpress && (
        <CopyField label={`Número Multicaixa Express · ${accounts.multicaixaExpress.holder}`} value={accounts.multicaixaExpress.phone} />
      )}
      {method === "kwik" && accounts.kwik && <CopyField label={`KWiK · ${accounts.kwik.holder}`} value={accounts.kwik.id} />}
      {(method === "transferencia" || method === "deposito") && iban && <CopyField label={`IBAN · ${iban.bank} · ${iban.holder}`} value={iban.iban} />}
      {method === "deposito" && accounts.depositInstructions && <p className="text-sm text-amber-900">{accounts.depositInstructions}</p>}
      {!accountAvailable(method, accounts) && (
        <p className="flex items-start gap-2 rounded-xl bg-white p-3 text-sm text-ink-700">
          <Info className="mt-0.5 size-4 shrink-0" /> Os dados para este método ainda não foram definidos. Fale connosco pelo WhatsApp para pagar.
        </p>
      )}
      {expiresAt && (
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <Clock className="mt-0.5 size-4 shrink-0" /> Pague e envie o comprovativo até <strong>{formatDateTime(expiresAt)}</strong>. Depois disso a vaga é libertada.
        </p>
      )}
    </div>
  );
}

function accountAvailable(method: PaymentMethod, a: PaymentAccounts) {
  if (method === "multicaixa-express") return !!a.multicaixaExpress?.phone;
  if (method === "kwik") return !!a.kwik?.id;
  return a.iban.length > 0;
}
