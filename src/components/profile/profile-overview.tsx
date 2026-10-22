"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, CalendarDays, ChevronRight, Clock, CreditCard, HelpCircle, MapPin, QrCode, Search, Ticket, Trophy, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button, ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { daysUntil, formatDate, formatDateTime, formatKz } from "@/lib/format";
import { PaymentInstructions } from "@/components/payments/payment-instructions";
import { TicketModal } from "./ticket-modal";
import { type RegistrationWithEvent, type ResultWithEvent, isUpcoming } from "./profile-data";

const QUICK_LINKS = [
  { href: "/perfil/inscricoes", label: "As minhas inscrições", hint: "Bilhetes e pagamentos", Icon: Ticket },
  { href: "/perfil/resultados", label: "Os meus resultados", hint: "Tempos e posições", Icon: Trophy },
  { href: "/perfil/dados", label: "Os meus dados", hint: "Nome, BI, contacto de emergência", Icon: UserRound },
  { href: "/eventos", label: "Procurar provas", hint: "Corridas, ciclismo, trail…", Icon: Search },
  { href: "/ajuda", label: "Ajuda", hint: "Perguntas frequentes", Icon: HelpCircle },
];

export function ProfileOverview({ registrations: regs, results, today }: { registrations: RegistrationWithEvent[]; results: ResultWithEvent[]; today: string }) {
  const { user } = useAuth();
  const [ticketOpen, setTicketOpen] = useState(false);
  if (!user) return null;

  const upcoming = regs.filter((r) => isUpcoming(r, today));
  const nextConfirmed = upcoming.find((r) => r.status === "confirmada") ?? upcoming[0];
  const pending = upcoming.filter((r) => r.status === "pagamento-pendente" && r.payment.state === "pendente");
  const last = results.find((r) => r.status === "terminou");
  const missingData = !user.birthDate || !user.documentNumber || !user.emergencyContact?.name;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Alerta de pagamento pendente */}
        {pending.map((p) => (
          <Card key={p.id} className="overflow-hidden border-amber-300 ring-4 ring-amber-100">
            <div className="flex items-start gap-3 bg-amber-50 px-5 py-4 sm:px-6">
              <AlertTriangle className="mt-0.5 size-6 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-amber-900">Falta pagar a sua inscrição</p>
                <p className="text-[15px] text-amber-900/80">
                  {p.event.title} · {p.distance?.name}.{" "}
                  Pague e envie o comprovativo pelo WhatsApp da organização (botão abaixo).
                </p>
              </div>
            </div>
            <div className="p-5 sm:p-6">
              {p.accounts && <PaymentInstructions method={p.payment.method} amount={p.payment.amount} code={p.code} accounts={p.accounts} expiresAt={p.payment.expiresAt} eventTitle={p.event.title} />}
            </div>
          </Card>
        ))}

        {/* Próxima prova */}
        {nextConfirmed ? (
          <Card className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              <div className="relative h-44 shrink-0 bg-ink-100 sm:h-auto sm:w-48">
                <Image src={nextConfirmed.event.poster} alt={`Cartaz: ${nextConfirmed.event.title}`} fill sizes="(min-width: 640px) 192px, 100vw" className="object-cover" />
              </div>
              <div className="flex flex-1 flex-col gap-4 p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold tracking-wide text-brand-600 uppercase">A sua próxima prova</p>
                    <h2 className="mt-1 text-xl leading-snug font-extrabold text-ink-900">{nextConfirmed.event.title}</h2>
                  </div>
                  <div className="shrink-0 rounded-2xl bg-ink-900 px-4 py-2.5 text-center text-white">
                    {(() => {
                      const d = daysUntil(nextConfirmed.event.date, today);
                      return d <= 0 ? (
                        <span className="font-display text-2xl font-extrabold">Hoje!</span>
                      ) : (
                        <>
                          <span className="block font-display text-4xl leading-none font-extrabold text-brand-400 tabular">{d}</span>
                          <span className="text-xs font-semibold text-ink-300">{d === 1 ? "dia" : "dias"}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <ul className="grid gap-2 text-[15px] text-ink-700 sm:grid-cols-2">
                  <li className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-ink-400" /> {formatDate(nextConfirmed.event.date)}
                  </li>
                  <li className="flex items-center gap-2">
                    <Clock className="size-4 text-ink-400" /> Partida às {nextConfirmed.distance?.startTime ?? nextConfirmed.event.startTime}
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="size-4 text-ink-400" /> {nextConfirmed.event.venue}
                  </li>
                  <li className="flex items-center gap-2">
                    <Ticket className="size-4 text-ink-400" /> {nextConfirmed.distance?.name} · Dorsal <strong>{nextConfirmed.bib || "após o pagamento"}</strong>
                  </li>
                </ul>
                <div className="mt-auto flex flex-wrap gap-2">
                  {nextConfirmed.status === "confirmada" && (
                    <Button variant="dark" onClick={() => setTicketOpen(true)}>
                      <QrCode /> Ver bilhete
                    </Button>
                  )}
                  <ButtonLink href={`/eventos/${nextConfirmed.event.slug}`} variant="outline">
                    Detalhes da prova
                  </ButtonLink>
                </div>
              </div>
            </div>
            {ticketOpen && <TicketModal reg={nextConfirmed} open onClose={() => setTicketOpen(false)} />}
          </Card>
        ) : (
          <EmptyState
            icon={<CalendarDays />}
            title="Não tem provas marcadas"
            description="Escolha uma corrida, caminhada ou passeio de bicicleta e inscreva-se em poucos minutos."
            action={
              <ButtonLink href="/eventos" size="lg">
                Ver eventos
              </ButtonLink>
            }
          />
        )}

        {upcoming.length > 1 && (
          <Card>
            <CardHeader title="Outras inscrições" action={<Link href="/perfil/inscricoes" className="text-sm font-semibold text-brand-700 hover:underline">Ver todas</Link>} />
            <ul className="divide-y divide-ink-100">
              {upcoming
                .filter((r) => r.id !== nextConfirmed?.id)
                .map((r) => (
                  <li key={r.id}>
                    <Link href="/perfil/inscricoes" className="flex items-center gap-4 px-5 py-3.5 hover:bg-ink-50 sm:px-6">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink-900">{r.event.title}</p>
                        <p className="text-sm text-ink-500">
                          {formatDate(r.event.date)} · {r.distance?.name}
                        </p>
                      </div>
                      {r.status === "pagamento-pendente" && (
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700">
                          <CreditCard className="size-4" /> {formatKz(r.payment.amount)}
                        </span>
                      )}
                      <ChevronRight className="size-5 text-ink-400" />
                    </Link>
                  </li>
                ))}
            </ul>
          </Card>
        )}
      </div>

      <div className="space-y-6">
        {missingData && (
          <Card className="p-5">
            <p className="font-bold text-ink-900">Complete os seus dados</p>
            <p className="mt-1 text-[15px] text-ink-600">Com a data de nascimento, BI e contacto de emergência preenchidos, a inscrição numa prova fica muito mais rápida.</p>
            <ButtonLink href="/perfil/dados" variant="soft" className="mt-4 w-full">
              <UserRound /> Completar agora
            </ButtonLink>
          </Card>
        )}

        {last && (
          <Card className="p-5">
            <p className="text-sm font-bold tracking-wide text-brand-600 uppercase">Último resultado</p>
            <p className="mt-1 font-bold text-ink-900">{last.event.title}</p>
            <p className="text-sm text-ink-500">{last.distance?.name}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <span className="font-display text-4xl font-extrabold text-ink-900 tabular">{last.chipTime}</span>
              <span className="text-right text-sm text-ink-600">
                <strong className="text-ink-900">{last.position}º</strong> geral
              </span>
            </div>
            <ButtonLink href="/perfil/resultados" variant="outline" className="mt-4 w-full">
              <Trophy /> Todos os resultados
            </ButtonLink>
          </Card>
        )}

        <Card>
          <CardHeader title="Atalhos" />
          <ul className="p-2">
            {QUICK_LINKS.map(({ href, label, hint, Icon }) => (
              <li key={href}>
                <Link href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 hover:bg-ink-50">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink-900">{label}</span>
                    <span className="block truncate text-sm text-ink-500">{hint}</span>
                  </span>
                  <ChevronRight className="size-5 text-ink-400" />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
