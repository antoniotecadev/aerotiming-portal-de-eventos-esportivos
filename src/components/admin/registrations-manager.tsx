"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Ban, CheckCircle2, Download, Hash, MoreVertical, Package, PackageCheck, Ticket, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { PAYMENT_STATUS, formatDateTime, formatKz } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type AdminParticipant, downloadFile, normalize, participantPrice, toCsv, useAdmin } from "./admin-store";
import { ConfirmModal, FilterSelect, MenuItem, PageTitle, Pagination, RowMenu, SearchInput, StatCard, TableWrap, td, th } from "./admin-ui";

const PER_PAGE = 25;

export function RegistrationsManager() {
  return (
    <Suspense fallback={null}>
      <Inner />
    </Suspense>
  );
}

function Inner() {
  const params = useSearchParams();
  const { data, update, confirmPayment } = useAdmin();
  const toast = useToast();
  const [q, setQ] = useState(params.get("q") ?? "");
  const [eventSlug, setEventSlug] = useState(params.get("evento") ?? "");
  const [distanceId, setDistanceId] = useState("");
  const [payment, setPayment] = useState("");
  const [kit, setKit] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editBib, setEditBib] = useState<AdminParticipant | null>(null);
  const [toCancel, setToCancel] = useState<AdminParticipant | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  // Actualiza os filtros quando se chega pela pesquisa global
  useEffect(() => {
    setQ(params.get("q") ?? "");
    setEventSlug(params.get("evento") ?? "");
  }, [params]);

  const eventsWithParticipants = useMemo(() => {
    const slugs = new Set(data.participants.map((p) => p.eventSlug));
    return data.events.filter((e) => slugs.has(e.slug)).sort((a, b) => b.date.localeCompare(a.date));
  }, [data.events, data.participants]);
  const currentEvent = data.events.find((e) => e.slug === eventSlug);

  const filtered = useMemo(() => {
    const n = normalize(q.trim());
    return data.participants
      .filter(
        (p) =>
          (!eventSlug || p.eventSlug === eventSlug) &&
          (!distanceId || p.distanceId === distanceId) &&
          (!payment || p.paymentStatus === payment) &&
          (!kit || (kit === "levantado" ? p.kitPickedUp : !p.kitPickedUp)) &&
          (!n || normalize(`${p.name} ${p.bib} ${p.club}`).includes(n)),
      )
      .sort((a, b) => b.registeredAt.localeCompare(a.registeredAt));
  }, [data.participants, q, eventSlug, distanceId, payment, kit]);

  useEffect(() => setPage(1), [q, eventSlug, distanceId, payment, kit]);

  const counts = useMemo(() => {
    const c = { total: filtered.length, confirmado: 0, pendente: 0, cancelado: 0, kit: 0, revenue: 0 };
    filtered.forEach((p) => {
      c[p.paymentStatus]++;
      if (p.kitPickedUp) c.kit++;
      if (p.paymentStatus === "confirmado") c.revenue += participantPrice(data.events, p);
    });
    return c;
  }, [filtered, data.events]);

  const pages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const rows = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const selectedPending = filtered.filter((p) => selected.has(p.id) && p.paymentStatus === "pendente");
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const ev = (slug: string) => data.events.find((e) => e.slug === slug);
  const distName = (p: AdminParticipant) => ev(p.eventSlug)?.distances.find((d) => d.id === p.distanceId)?.name ?? p.distanceId;

  function toggleAll() {
    setSelected((s) => {
      const next = new Set(s);
      rows.forEach((r) => (allOnPage ? next.delete(r.id) : next.add(r.id)));
      return next;
    });
  }

  function exportCsv() {
    const header = ["Dorsal", "Nome", "Sexo", "Escalão", "Clube", "Província", "Nacionalidade", "Evento", "Distância", "Pagamento", "Valor (Kz)", "Kit", "Data de inscrição"];
    const body = filtered.map((p) => [
      p.bib,
      p.name,
      p.gender,
      p.ageGroup,
      p.club,
      p.province,
      p.nationality,
      ev(p.eventSlug)?.title ?? p.eventSlug,
      distName(p),
      PAYMENT_STATUS[p.paymentStatus].label,
      participantPrice(data.events, p),
      p.kitPickedUp ? "Levantado" : "Por levantar",
      p.registeredAt.slice(0, 10),
    ]);
    downloadFile(`inscricoes${eventSlug ? `-${eventSlug}` : ""}.csv`, toCsv([header, ...body]));
    toast({ title: "CSV exportado", description: `${filtered.length} inscrições` });
  }

  return (
    <>
      <PageTitle
        title="Inscrições"
        description="Participantes inscritos em todos os eventos."
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download /> Exportar CSV
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Inscrições" value={counts.total.toLocaleString("pt-PT")} icon={<Ticket />} tone="ink" />
        <StatCard label="Pagas" value={counts.confirmado.toLocaleString("pt-PT")} hint={formatKz(counts.revenue)} icon={<CheckCircle2 />} tone="green" />
        <StatCard label="Por pagar" value={counts.pendente.toLocaleString("pt-PT")} hint={`${counts.cancelado} canceladas`} icon={<Ban />} tone="amber" />
        <StatCard label="Kits levantados" value={counts.kit.toLocaleString("pt-PT")} hint={`de ${(counts.total - counts.cancelado).toLocaleString("pt-PT")} activas`} icon={<PackageCheck />} tone="blue" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1.2fr_1fr_1fr_1fr]">
        <SearchInput value={q} onChange={setQ} placeholder="Pesquisar por nome, dorsal ou clube" className="sm:col-span-2 xl:col-span-1" />
        <FilterSelect
          value={eventSlug}
          onChange={(v) => {
            setEventSlug(v);
            setDistanceId("");
          }}
          label="Filtrar por evento"
        >
          <option value="">Todos os eventos</option>
          {eventsWithParticipants.map((e) => (
            <option key={e.id} value={e.slug}>
              {e.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={distanceId} onChange={setDistanceId} label="Filtrar por distância" className={cn(!currentEvent && "opacity-60")}>
          <option value="">{currentEvent ? "Todas as distâncias" : "Distância (escolha o evento)"}</option>
          {currentEvent?.distances.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={payment} onChange={setPayment} label="Filtrar por pagamento">
          <option value="">Todos os pagamentos</option>
          {(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS[s].label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={kit} onChange={setKit} label="Filtrar por kit">
          <option value="">Kit: todos</option>
          <option value="levantado">Kit levantado</option>
          <option value="por-levantar">Kit por levantar</option>
        </FilterSelect>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white">
          <span className="text-sm font-semibold">
            {selected.size} seleccionada{selected.size === 1 ? "" : "s"} · {selectedPending.length} por pagar
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setSelected(new Set())}>
              Limpar
            </Button>
            <Button size="sm" disabled={selectedPending.length === 0} onClick={() => setBulkConfirm(true)}>
              <CheckCircle2 /> Confirmar pagamentos
            </Button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={<Ticket />} title="Nenhuma inscrição encontrada" description="Experimente outros filtros ou limpe a pesquisa." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[960px]">
            <thead className="bg-ink-50">
              <tr>
                <th className={`${th} w-10`}>
                  <input type="checkbox" checked={allOnPage} onChange={toggleAll} aria-label="Seleccionar todos nesta página" className="size-4 accent-brand-600" />
                </th>
                <th className={th}>Dorsal</th>
                <th className={th}>Atleta</th>
                <th className={th}>Evento / distância</th>
                <th className={th}>Inscrição</th>
                <th className={th}>Valor</th>
                <th className={th}>Pagamento</th>
                <th className={th}>Kit</th>
                <th className={`${th} text-right`}>Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {rows.map((p) => (
                <tr key={p.id} className={cn("hover:bg-ink-50/60", selected.has(p.id) && "bg-brand-50/40", p.paymentStatus === "cancelado" && "text-ink-400")}>
                  <td className={td}>
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() =>
                        setSelected((s) => {
                          const next = new Set(s);
                          if (next.has(p.id)) next.delete(p.id);
                          else next.add(p.id);
                          return next;
                        })
                      }
                      aria-label={`Seleccionar ${p.name}`}
                      className="size-4 accent-brand-600"
                    />
                  </td>
                  <td className={`${td} tabular font-bold text-ink-900`}>#{p.bib}</td>
                  <td className={td}>
                    <p className="font-semibold text-ink-900">{p.name}</p>
                    <p className="text-xs text-ink-500">
                      {p.gender} · {p.ageGroup} · {p.club}
                    </p>
                  </td>
                  <td className={td}>
                    <p className="max-w-60 truncate">{ev(p.eventSlug)?.title ?? p.eventSlug}</p>
                    <p className="text-xs text-ink-500">{distName(p)}</p>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDateTime(p.registeredAt)}</td>
                  <td className={`${td} tabular whitespace-nowrap`}>{formatKz(participantPrice(data.events, p))}</td>
                  <td className={td}>
                    <Badge tone={PAYMENT_STATUS[p.paymentStatus].tone} dot>
                      {PAYMENT_STATUS[p.paymentStatus].label}
                    </Badge>
                  </td>
                  <td className={td}>{p.kitPickedUp ? <Badge tone="blue">Levantado</Badge> : <span className="text-xs text-ink-500">Por levantar</span>}</td>
                  <td className={`${td} text-right`}>
                    <div className="flex items-center justify-end gap-1">
                      {p.paymentStatus === "pendente" && (
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => {
                            confirmPayment(p.id);
                            toast({ title: "Pagamento confirmado", description: `${p.name} · #${p.bib}` });
                          }}
                        >
                          Confirmar
                        </Button>
                      )}
                      <RowMenu trigger={<MoreVertical className="size-4" />}>
                        {(close) => (
                          <>
                            <MenuItem
                              icon={<CheckCircle2 />}
                              disabled={p.paymentStatus === "confirmado"}
                              onClick={() => {
                                close();
                                confirmPayment(p.id);
                                toast({ title: "Pagamento confirmado", description: `${p.name} · #${p.bib}` });
                              }}
                            >
                              Confirmar pagamento
                            </MenuItem>
                            <MenuItem
                              icon={p.kitPickedUp ? <Package /> : <PackageCheck />}
                              disabled={p.paymentStatus === "cancelado"}
                              onClick={() => {
                                close();
                                update("participants", p.id, { kitPickedUp: !p.kitPickedUp });
                                toast({ title: p.kitPickedUp ? "Kit marcado como por levantar" : "Kit marcado como levantado", description: p.name });
                              }}
                            >
                              {p.kitPickedUp ? "Desmarcar kit levantado" : "Marcar kit levantado"}
                            </MenuItem>
                            <MenuItem icon={<Hash />} onClick={() => (close(), setEditBib(p))}>
                              Editar dorsal
                            </MenuItem>
                            {p.paymentStatus === "cancelado" ? (
                              <MenuItem
                                icon={<Undo2 />}
                                onClick={() => {
                                  close();
                                  update("participants", p.id, { paymentStatus: "pendente" });
                                  toast({ title: "Inscrição reactivada", description: p.name });
                                }}
                              >
                                Reactivar inscrição
                              </MenuItem>
                            ) : (
                              <MenuItem icon={<Ban />} danger onClick={() => (close(), setToCancel(p))}>
                                Cancelar inscrição
                              </MenuItem>
                            )}
                          </>
                        )}
                      </RowMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Pagination page={page} pages={pages} onChange={setPage} total={filtered.length} perPage={PER_PAGE} />
        </TableWrap>
      )}

      <BibModal participant={editBib} onClose={() => setEditBib(null)} />

      <ConfirmModal
        open={!!toCancel}
        onClose={() => setToCancel(null)}
        title="Cancelar inscrição?"
        description={
          <>
            A inscrição de <strong>{toCancel?.name}</strong> (dorsal #{toCancel?.bib}) será cancelada e a vaga libertada.
          </>
        }
        confirmLabel="Cancelar inscrição"
        onConfirm={() => {
          if (!toCancel) return;
          update("participants", toCancel.id, { paymentStatus: "cancelado", kitPickedUp: false });
          toast({ title: "Inscrição cancelada", description: toCancel.name });
        }}
      />

      <ConfirmModal
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        danger={false}
        title={`Confirmar ${selectedPending.length} pagamento${selectedPending.length === 1 ? "" : "s"}?`}
        description="As inscrições seleccionadas que estão por pagar passam a confirmadas. Os atletas recebem a confirmação por SMS e e-mail."
        confirmLabel="Confirmar pagamentos"
        onConfirm={() => {
          confirmPayment(selectedPending.map((p) => p.id));
          toast({ title: "Pagamentos confirmados", description: `${selectedPending.length} inscrições actualizadas` });
          setSelected(new Set());
        }}
      />
    </>
  );
}

function BibModal({ participant, onClose }: { participant: AdminParticipant | null; onClose: () => void }) {
  const { data, update } = useAdmin();
  const toast = useToast();
  const [bib, setBib] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBib(participant?.bib ?? "");
    setError("");
  }, [participant]);

  function save() {
    if (!participant) return;
    const v = bib.trim();
    if (!/^\d{1,6}$/.test(v)) return setError("O dorsal deve ter apenas números (até 6 dígitos).");
    const clash = data.participants.find((p) => p.eventSlug === participant.eventSlug && p.bib === v && p.id !== participant.id);
    if (clash) return setError(`O dorsal #${v} já está atribuído a ${clash.name}.`);
    update("participants", participant.id, { bib: v });
    toast({ title: "Dorsal actualizado", description: `${participant.name} · #${v}` });
    onClose();
  }

  return (
    <Modal
      open={!!participant}
      onClose={onClose}
      size="sm"
      title="Editar dorsal"
      description={participant?.name}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save}>Guardar</Button>
        </>
      }
    >
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Field label="Número do dorsal" htmlFor="bib" error={error} hint="Deve ser único dentro do evento.">
          <Input id="bib" inputMode="numeric" value={bib} onChange={(e) => setBib(e.target.value)} aria-invalid={!!error} autoFocus />
        </Field>
      </form>
    </Modal>
  );
}
