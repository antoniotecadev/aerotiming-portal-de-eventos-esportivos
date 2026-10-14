"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowRight, CalendarClock, CalendarPlus, Clock, GalleryHorizontalEnd, Ticket, Timer, Wallet } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PAYMENT_STATUS, formatDate, formatDateTime, formatKz, monthShort } from "@/lib/format";
import { TODAY } from "@/lib/data";
import { participantPrice, useAdmin } from "./admin-store";
import { PageTitle, ProgressBar, StatCard, TableWrap, td, th } from "./admin-ui";

export function Dashboard() {
  const { data } = useAdmin();
  const { events, participants } = data;

  const stats = useMemo(() => {
    const active = participants.filter((p) => p.paymentStatus !== "cancelado");
    const confirmed = participants.filter((p) => p.paymentStatus === "confirmado");
    const pending = participants.filter((p) => p.paymentStatus === "pendente");
    const revenue = confirmed.reduce((acc, p) => acc + participantPrice(events, p), 0);
    const pendingValue = pending.reduce((acc, p) => acc + participantPrice(events, p), 0);
    const upcoming = events.filter((e) => e.date >= TODAY && e.status !== "cancelado" && !e.draft).sort((a, b) => a.date.localeCompare(b.date));

    const byEvent = events
      .map((e) => ({ id: e.id, label: e.title, value: participants.filter((p) => p.eventSlug === e.slug && p.paymentStatus !== "cancelado").length }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);

    // Receita confirmada dos últimos 8 meses (até ao mês actual)
    const [ty, tm] = TODAY.split("-").map(Number);
    const months = Array.from({ length: 8 }, (_, i) => {
      const d = new Date(ty, tm - 1 - (7 - i), 1);
      return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: monthShort(d.getMonth()), year: d.getFullYear(), value: 0 };
    });
    confirmed.forEach((p) => {
      const m = months.find((x) => p.registeredAt.startsWith(x.key));
      if (m) m.value += participantPrice(events, p);
    });

    const latest = [...participants].sort((a, b) => b.registeredAt.localeCompare(a.registeredAt)).slice(0, 8);
    return { total: active.length, revenue, pending: pending.length, pendingValue, upcoming, byEvent, months, latest };
  }, [events, participants]);

  const eventTitle = (slug: string) => events.find((e) => e.slug === slug)?.title ?? slug;
  const distName = (slug: string, id: string) => events.find((e) => e.slug === slug)?.distances.find((d) => d.id === id)?.name ?? id;

  return (
    <>
      <PageTitle
        title="Painel"
        description="Resumo das inscrições, pagamentos e próximos eventos."
        actions={
          <>
            <ButtonLink href="/admin/eventos/novo" size="sm">
              <CalendarPlus /> Criar evento
            </ButtonLink>
            <ButtonLink href="/admin/resultados" size="sm" variant="outline">
              <Timer /> Publicar resultados
            </ButtonLink>
            <ButtonLink href="/admin/banners?novo=1" size="sm" variant="outline">
              <GalleryHorizontalEnd /> Novo banner
            </ButtonLink>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Inscrições totais" value={stats.total.toLocaleString("pt-PT")} hint="Excluindo canceladas" icon={<Ticket />} />
        <StatCard label="Receita confirmada" value={formatKz(stats.revenue)} hint="Pagamentos confirmados" icon={<Wallet />} tone="green" />
        <StatCard label="Pagamentos pendentes" value={stats.pending} hint={`${formatKz(stats.pendingValue)} por receber`} icon={<Clock />} tone="amber" />
        <StatCard label="Próximos eventos" value={stats.upcoming.length} hint={stats.upcoming[0] ? `Próximo: ${formatDate(stats.upcoming[0].date, false)}` : "—"} icon={<CalendarClock />} tone="blue" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Inscrições por evento" description="Inscrições activas (pagas e por pagar)" />
          <div className="space-y-3 p-5 sm:p-6">
            {stats.byEvent.length === 0 && <p className="text-sm text-ink-500">Ainda não há inscrições.</p>}
            {(() => {
              const max = Math.max(1, ...stats.byEvent.map((b) => b.value));
              return stats.byEvent.map((b) => (
                <div key={b.id} className="group" title={`${b.label}: ${b.value} inscrições`}>
                  <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-ink-700">{b.label}</span>
                    <span className="tabular shrink-0 font-semibold text-ink-900">{b.value}</span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-ink-100">
                    <div className="h-full rounded-full bg-brand-500 transition-colors group-hover:bg-brand-600" style={{ width: `${(b.value / max) * 100}%` }} />
                  </div>
                </div>
              ));
            })()}
          </div>
        </Card>

        <Card>
          <CardHeader title="Receita por mês" description="Pagamentos confirmados, últimos 8 meses" />
          <RevenueChart months={stats.months} />
        </Card>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-2">
          <CardHeader
            title="Próximos eventos"
            description="Taxa de ocupação das vagas"
            action={
              <Link href="/admin/eventos" className="shrink-0 text-sm font-semibold text-brand-600 hover:text-brand-700">
                Ver todos
              </Link>
            }
          />
          <ul className="divide-y divide-ink-100">
            {stats.upcoming.slice(0, 6).map((e) => {
              const total = e.distances.reduce((a, d) => a + d.totalSlots, 0);
              const taken = e.distances.reduce((a, d) => a + d.slotsTaken, 0);
              const pct = total ? (taken / total) * 100 : 0;
              return (
                <li key={e.id}>
                  <Link href={`/admin/eventos/${e.id}`} className="block px-5 py-4 hover:bg-ink-50 sm:px-6">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink-900">{e.title}</p>
                        <p className="text-sm text-ink-500">
                          {formatDate(e.date)} · {e.city}
                        </p>
                      </div>
                      <StatusBadge status={e.status} />
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <ProgressBar value={pct} />
                      <span className="tabular w-28 shrink-0 text-right text-xs font-semibold text-ink-600">
                        {taken.toLocaleString("pt-PT")}/{total.toLocaleString("pt-PT")} · {Math.round(pct)}%
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
            {stats.upcoming.length === 0 && <li className="px-6 py-8 text-sm text-ink-500">Sem eventos agendados.</li>}
          </ul>
        </Card>

        <div className="min-w-0 xl:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">Últimas inscrições</h2>
            <Link href="/admin/inscricoes" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              Gerir inscrições <ArrowRight className="size-4" />
            </Link>
          </div>
          <TableWrap>
            <table className="w-full min-w-[640px]">
              <thead className="bg-ink-50">
                <tr>
                  <th className={th}>Atleta</th>
                  <th className={th}>Evento</th>
                  <th className={th}>Data</th>
                  <th className={th}>Valor</th>
                  <th className={th}>Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {stats.latest.map((p) => (
                  <tr key={p.id} className="hover:bg-ink-50/60">
                    <td className={td}>
                      <p className="font-semibold text-ink-900">{p.name}</p>
                      <p className="text-xs text-ink-500">Dorsal #{p.bib}</p>
                    </td>
                    <td className={td}>
                      <p className="max-w-56 truncate">{eventTitle(p.eventSlug)}</p>
                      <p className="text-xs text-ink-500">{distName(p.eventSlug, p.distanceId)}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(p.registeredAt)}</td>
                    <td className={`${td} tabular whitespace-nowrap`}>{formatKz(participantPrice(events, p))}</td>
                    <td className={td}>
                      <Badge tone={PAYMENT_STATUS[p.paymentStatus].tone} dot>
                        {PAYMENT_STATUS[p.paymentStatus].label}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </div>
      </div>
    </>
  );
}

function compactKz(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")} M`;
  if (v >= 1_000) return `${Math.round(v / 1_000)} mil`;
  return String(v);
}

function RevenueChart({ months }: { months: { key: string; label: string; year: number; value: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.value));
  // Escala "redonda" para as linhas de grelha
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step) * step;
  const grid = [top, top / 2, 0];

  return (
    <div className="p-5 sm:p-6">
      <div className="relative h-56">
        {grid.map((g) => (
          <div key={g} className="absolute inset-x-0 flex items-center gap-2" style={{ bottom: `${(g / top) * 100}%` }}>
            <span className="tabular w-12 shrink-0 -translate-y-1/2 text-right text-[11px] text-ink-400">{compactKz(g)}</span>
            <span className="h-px flex-1 -translate-y-1/2 bg-ink-100" />
          </div>
        ))}
        <div className="absolute inset-y-0 right-0 left-14 flex items-end gap-1.5 sm:gap-3">
          {months.map((m) => (
            <div key={m.key} className="group relative flex h-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-10 rounded-t-[4px] bg-brand-500 transition-colors group-hover:bg-brand-600"
                style={{ height: `${(m.value / top) * 100}%`, minHeight: m.value > 0 ? 2 : 0 }}
              />
              <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lift group-hover:block">
                <span className="font-semibold">
                  {m.label} {m.year}
                </span>
                <br />
                <span className="tabular">{formatKz(m.value)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-2 flex gap-1.5 pl-14 sm:gap-3">
        {months.map((m) => (
          <span key={m.key} className="flex-1 text-center text-xs font-medium text-ink-500">
            {m.label}
          </span>
        ))}
      </div>
    </div>
  );
}
