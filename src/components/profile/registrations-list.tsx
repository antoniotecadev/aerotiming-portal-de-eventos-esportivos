"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, CreditCard, Hash, MapPin, QrCode, Route, Ticket, XCircle } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_METHOD, REGISTRATION_STATUS, daysUntil, formatDate, formatDateTime, formatKz } from "@/lib/format";
import { TODAY } from "@/lib/data";
import type { RegistrationStatus } from "@/lib/types";
import { PaymentBox } from "./payment-box";
import { TicketModal } from "./ticket-modal";
import { type RegistrationWithEvent, registrationsOf } from "./profile-data";

type Filter = "proximas" | "passadas" | "todas";

function RegistrationCard({
  reg,
  onTicket,
  onPay,
  onCancel,
}: {
  reg: RegistrationWithEvent;
  onTicket: () => void;
  onPay: () => void;
  onCancel: () => void;
}) {
  const { event } = reg;
  const status = REGISTRATION_STATUS[reg.status];
  const past = event.date < TODAY;
  const days = daysUntil(event.date, TODAY);
  const href = `/eventos/${event.slug}`;

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card sm:flex-row">
      <Link href={href} className="relative h-40 shrink-0 bg-ink-100 sm:h-auto sm:w-40" aria-label={`Ver evento: ${event.title}`}>
        <Image src={event.poster} alt={`Cartaz: ${event.title}`} fill sizes="(min-width: 640px) 160px, 100vw" className="object-cover" />
        {!past && reg.status !== "cancelada" && (
          <span className="absolute top-3 left-3 rounded-lg bg-ink-900/85 px-2.5 py-1 text-xs font-bold text-white backdrop-blur">
            {days === 0 ? "É hoje!" : days === 1 ? "Amanhã" : `Faltam ${days} dias`}
          </span>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-lg leading-snug font-bold text-ink-900">
            <Link href={href} className="hover:text-brand-700">
              {event.title}
            </Link>
          </h3>
          <Badge tone={past && reg.status === "confirmada" ? "gray" : status.tone} dot>
            {past && reg.status === "confirmada" ? "Prova realizada" : status.label}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[15px] text-ink-700 lg:grid-cols-4">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 shrink-0 text-ink-400" />
            <dt className="sr-only">Data</dt>
            <dd>{formatDate(event.date)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Route className="size-4 shrink-0 text-ink-400" />
            <dt className="sr-only">Distância</dt>
            <dd>{reg.distance?.name ?? reg.distanceId}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Hash className="size-4 shrink-0 text-ink-400" />
            <dt className="sr-only">Dorsal</dt>
            <dd>
              Dorsal <strong className="tabular">{reg.bib}</strong>
            </dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0 text-ink-400" />
            <dt className="sr-only">Local</dt>
            <dd className="truncate">{event.city}</dd>
          </div>
        </dl>

        <div className="flex items-center gap-2 rounded-xl bg-ink-50 px-3 py-2.5 text-sm text-ink-700">
          <CreditCard className="size-4 shrink-0 text-ink-500" />
          {reg.status === "pagamento-pendente" ? (
            <span>
              <strong className="text-amber-800">Por pagar: {formatKz(reg.payment.amount)}</strong>
              {reg.payment.expiresAt && <> · até {formatDateTime(reg.payment.expiresAt)}</>}
            </span>
          ) : reg.status === "cancelada" ? (
            <span>Inscrição cancelada</span>
          ) : (
            <span>
              Pago {formatKz(reg.payment.amount)} com {PAYMENT_METHOD[reg.payment.method]}
              {reg.payment.paidAt && <> · {formatDateTime(reg.payment.paidAt)}</>}
            </span>
          )}
        </div>

        {reg.status !== "cancelada" && (
          <div className="flex flex-wrap gap-2">
            {reg.status === "pagamento-pendente" ? (
              <Button onClick={onPay}>
                <CreditCard /> Pagar agora
              </Button>
            ) : (
              <Button variant={past ? "outline" : "dark"} onClick={onTicket}>
                <QrCode /> Bilhete
              </Button>
            )}
            {past && (
              <ButtonLink href={`/resultados/${event.slug}?q=${reg.bib}`} variant="outline">
                Ver o meu resultado
              </ButtonLink>
            )}
            {!past && (
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onCancel}>
                <XCircle /> Cancelar inscrição
              </Button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function RegistrationsList() {
  const { user } = useAuth();
  const toast = useToast();
  const [overrides, setOverrides] = useState<Record<string, RegistrationStatus>>({});
  const [filter, setFilter] = useState<Filter>("proximas");
  const [ticket, setTicket] = useState<RegistrationWithEvent | null>(null);
  const [pay, setPay] = useState<RegistrationWithEvent | null>(null);
  const [cancel, setCancel] = useState<RegistrationWithEvent | null>(null);

  const regs = useMemo(
    () => (user ? registrationsOf(user).map((r) => (overrides[r.id] ? { ...r, status: overrides[r.id] } : r)) : []),
    [user, overrides],
  );
  if (!user) return null;

  if (regs.length === 0)
    return (
      <EmptyState
        icon={<Ticket />}
        title="Ainda não tem inscrições"
        description="Quando se inscrever numa prova, ela aparece aqui com o seu bilhete e o dorsal."
        action={
          <ButtonLink href="/eventos" size="lg">
            Ver eventos
          </ButtonLink>
        }
      />
    );

  const upcoming = regs.filter((r) => r.event.date >= TODAY);
  const past = regs.filter((r) => r.event.date < TODAY).reverse();
  const shown = filter === "proximas" ? upcoming : filter === "passadas" ? past : [...upcoming, ...past];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">As minhas inscrições</h2>
          <p className="text-ink-600">Veja o bilhete, pague ou cancele as suas inscrições.</p>
        </div>
        <ButtonLink href="/eventos" variant="soft">
          <Ticket /> Inscrever-me noutra prova
        </ButtonLink>
      </div>

      <Tabs<Filter>
        value={filter}
        onChange={setFilter}
        items={[
          { id: "proximas", label: "Próximas", count: upcoming.length },
          { id: "passadas", label: "Passadas", count: past.length },
          { id: "todas", label: "Todas", count: regs.length },
        ]}
      />

      {shown.length === 0 ? (
        <EmptyState
          icon={<CalendarDays />}
          title={filter === "proximas" ? "Sem provas marcadas" : "Sem provas passadas"}
          description="Escolha a sua próxima prova no calendário."
          action={<ButtonLink href="/eventos">Ver eventos</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4">
          {shown.map((r) => (
            <RegistrationCard key={r.id} reg={r} onTicket={() => setTicket(r)} onPay={() => setPay(r)} onCancel={() => setCancel(r)} />
          ))}
        </div>
      )}

      {ticket && <TicketModal reg={ticket} open onClose={() => setTicket(null)} />}

      <Modal
        open={!!pay}
        onClose={() => setPay(null)}
        title="Pagar a inscrição"
        description={pay ? `${pay.event.title} · ${pay.distance?.name ?? ""}` : undefined}
        footer={
          <Button
            onClick={() => {
              setPay(null);
              toast({ title: "Obrigado!", description: "Assim que o pagamento for recebido, enviamos um SMS de confirmação.", tone: "info" });
            }}
          >
            Já paguei
          </Button>
        }
      >
        {pay && (
          <div className="p-5 sm:p-6">
            <p className="mb-4 text-[15px] text-ink-700">
              Pague com <strong>Referência Multicaixa</strong> no ATM, na app Multicaixa Express ou no Internet banking:
            </p>
            <PaymentBox payment={pay.payment} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!cancel}
        onClose={() => setCancel(null)}
        size="sm"
        title="Cancelar inscrição?"
        footer={
          <>
            <Button variant="outline" onClick={() => setCancel(null)}>
              Não, manter
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!cancel) return;
                setOverrides((o) => ({ ...o, [cancel.id]: "cancelada" }));
                toast({ title: "Inscrição cancelada", description: cancel.event.title });
                setCancel(null);
              }}
            >
              <XCircle /> Sim, cancelar
            </Button>
          </>
        }
      >
        {cancel && (
          <div className="space-y-3 p-5 text-[15px] text-ink-700 sm:p-6">
            <p>
              Vai cancelar a sua inscrição em <strong>{cancel.event.title}</strong> ({cancel.distance?.name}). O seu dorsal <strong>{cancel.bib}</strong> deixa de ser válido.
            </p>
            {cancel.status === "confirmada" && (
              <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900 ring-1 ring-amber-200">
                Atenção: segundo o regulamento, o valor pago não é devolvido, excepto se a prova for cancelada pela organização.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
