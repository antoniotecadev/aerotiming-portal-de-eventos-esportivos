"use client";

import { useEffect, useState } from "react";
import { Ban, CheckCircle2, Download, Hash, MoreVertical, Package, PackageCheck, Ticket, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import { PAYMENT_STATUS, formatDateTime, formatKz } from "@/lib/format";
import type { PaymentStatus } from "@/lib/types";
import { useUrlFilters } from "@/lib/use-url-filters";
import { cn } from "@/lib/utils";
import type { AdminRegistrationRow, getAdminRegistrations } from "@/server/queries/admin-lists";
import { useAdminRun } from "./admin-store";
import { ConfirmModal, FilterSelect, MenuItem, PageTitle, Pagination, RowMenu, SearchInput, StatCard, TableWrap, td, th } from "./admin-ui";

export type RegistrationsView = Awaited<ReturnType<typeof getAdminRegistrations>>;
const PER_PAGE = 25;

/** Inscrições do painel — filtros e páginas no servidor (12.10), guardados no URL. */
export function RegistrationsManager({ view }: { view: RegistrationsView }) {
  const { params, set, pending: navigating } = useUrlFilters();
  const { run, pending } = useAdminRun();
  const q = params.get("q") ?? "";
  const eventSlug = params.get("evento") ?? "";
  const distanceId = params.get("distancia") ?? "";
  const payment = params.get("pagamento") ?? "";
  const kit = params.get("kit") ?? "";
  const [search, setSearch] = useState(q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editBib, setEditBib] = useState<AdminRegistrationRow | null>(null);
  const [toCancel, setToCancel] = useState<AdminRegistrationRow | null>(null);
  const [bulkConfirm, setBulkConfirm] = useState(false);

  useEffect(() => setSearch(q), [q]);
  // A pesquisa só vai ao servidor quando se pára de escrever
  useEffect(() => {
    if (search.trim() === q) return;
    const t = setTimeout(() => set({ q: search.trim() }), 350);
    return () => clearTimeout(t);
  }, [search]); // eslint-disable-line react-hooks/exhaustive-deps
  // A selecção é só da página que está no ecrã
  useEffect(() => setSelected(new Set()), [view]);

  const { rows, counts } = view;
  const currentEvent = view.events.find((e) => e.slug === eventSlug);
  const selectedPending = rows.filter((p) => selected.has(p.id) && p.paymentStatus === "pendente");
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const csvHref = `/api/admin/inscricoes/csv?${new URLSearchParams([...params.entries()].filter(([k]) => k !== "pagina")).toString()}`;

  const toggleAll = () =>
    setSelected((s) => {
      const next = new Set(s);
      rows.forEach((r) => (allOnPage ? next.delete(r.id) : next.add(r.id)));
      return next;
    });

  const confirm = (ids: string[], label: string) => run({ type: "payment.confirm", participantIds: ids }, label);

  return (
    <>
      <PageTitle
        title="Inscrições"
        description="Participantes inscritos nos eventos que gere."
        actions={
          <a href={csvHref} download className={cn(buttonClasses("outline"), counts.total === 0 && "pointer-events-none opacity-50")}>
            <Download /> Exportar CSV
          </a>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Inscrições" value={counts.total.toLocaleString("pt-PT")} icon={<Ticket />} tone="ink" />
        <StatCard label="Pagas" value={counts.confirmado.toLocaleString("pt-PT")} hint={formatKz(counts.revenue)} icon={<CheckCircle2 />} tone="green" />
        <StatCard label="Por pagar" value={counts.pendente.toLocaleString("pt-PT")} hint={`${counts.cancelado} canceladas`} icon={<Ban />} tone="amber" />
        <StatCard label="Kits levantados" value={counts.kit.toLocaleString("pt-PT")} hint={`de ${(counts.total - counts.cancelado).toLocaleString("pt-PT")} activas`} icon={<PackageCheck />} tone="blue" />
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.4fr_1.2fr_1fr_1fr_1fr]">
        <SearchInput value={search} onChange={setSearch} placeholder="Nome, dorsal, clube ou código" className="sm:col-span-2 xl:col-span-1" />
        <FilterSelect value={eventSlug} onChange={(v) => set({ evento: v, distancia: null })} label="Filtrar por evento">
          <option value="">Todos os eventos</option>
          {view.events.map((e) => (
            <option key={e.slug} value={e.slug}>
              {e.title}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={distanceId} onChange={(v) => set({ distancia: v })} label="Filtrar por distância" className={cn(!currentEvent && "opacity-60")}>
          <option value="">{currentEvent ? "Todas as distâncias" : "Distância (escolha o evento)"}</option>
          {currentEvent?.distances.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={payment} onChange={(v) => set({ pagamento: v })} label="Filtrar por pagamento">
          <option value="">Todos os pagamentos</option>
          {(Object.keys(PAYMENT_STATUS) as PaymentStatus[]).map((s) => (
            <option key={s} value={s}>
              {PAYMENT_STATUS[s].label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={kit} onChange={(v) => set({ kit: v })} label="Filtrar por kit">
          <option value="">Kit: todos</option>
          <option value="levantado">Kit levantado</option>
          <option value="por-levantar">Kit por levantar</option>
        </FilterSelect>
      </div>

      {selected.size > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white">
          <span className="text-sm font-semibold">
            {selected.size} seleccionada{selected.size === 1 ? "" : "s"} nesta página · {selectedPending.length} por pagar
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" className="text-white hover:bg-white/10 hover:text-white" onClick={() => setSelected(new Set())}>
              Limpar
            </Button>
            <Button size="sm" disabled={selectedPending.length === 0 || pending} onClick={() => setBulkConfirm(true)}>
              <CheckCircle2 /> Confirmar pagamentos
            </Button>
          </div>
        </div>
      )}

      <div className={cn("transition-opacity", (navigating || pending) && "opacity-60")} aria-busy={navigating || pending}>
        {rows.length === 0 ? (
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
                      <p className="max-w-60 truncate">{p.eventTitle}</p>
                      <p className="text-xs text-ink-500">{p.distanceName}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(p.registeredAt)}</td>
                    <td className={`${td} tabular whitespace-nowrap`}>{formatKz(p.price)}</td>
                    <td className={td}>
                      <Badge tone={PAYMENT_STATUS[p.paymentStatus].tone} dot>
                        {PAYMENT_STATUS[p.paymentStatus].label}
                      </Badge>
                    </td>
                    <td className={td}>{p.kitPickedUp ? <Badge tone="blue">Levantado</Badge> : <span className="text-xs text-ink-500">Por levantar</span>}</td>
                    <td className={`${td} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        {p.paymentStatus === "pendente" && (
                          <Button size="sm" variant="soft" disabled={pending} onClick={() => confirm([p.id], "Pagamento confirmado")}>
                            Confirmar
                          </Button>
                        )}
                        <RowMenu trigger={<MoreVertical className="size-4" />}>
                          {(close) => (
                            <>
                              <MenuItem icon={<CheckCircle2 />} disabled={p.paymentStatus === "confirmado"} onClick={() => (close(), confirm([p.id], "Pagamento confirmado"))}>
                                Confirmar pagamento
                              </MenuItem>
                              <MenuItem
                                icon={p.kitPickedUp ? <Package /> : <PackageCheck />}
                                disabled={p.paymentStatus === "cancelado"}
                                onClick={() => {
                                  close();
                                  run({ type: "participant.update", id: p.id, patch: { kitPickedUp: !p.kitPickedUp } }, p.kitPickedUp ? "Kit marcado como por levantar" : "Kit marcado como levantado");
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
                                  onClick={() => (close(), run({ type: "participant.update", id: p.id, patch: { paymentStatus: "pendente" } }, "Inscrição reactivada"))}
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
            <Pagination page={view.page} pages={view.pages} onChange={(p) => set({ pagina: p })} total={counts.total} perPage={PER_PAGE} />
          </TableWrap>
        )}
      </div>

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
        onConfirm={() => toCancel && run({ type: "participant.update", id: toCancel.id, patch: { paymentStatus: "cancelado", kitPickedUp: false } }, "Inscrição cancelada")}
      />

      <ConfirmModal
        open={bulkConfirm}
        onClose={() => setBulkConfirm(false)}
        danger={false}
        title={`Confirmar ${selectedPending.length} pagamento${selectedPending.length === 1 ? "" : "s"}?`}
        description="As inscrições seleccionadas que estão por pagar passam a confirmadas. O dorsal é atribuído e o atleta vê a confirmação na sua conta."
        confirmLabel="Confirmar pagamentos"
        onConfirm={() => {
          confirm(selectedPending.map((p) => p.id), "Pagamentos confirmados");
          setSelected(new Set());
        }}
      />
    </>
  );
}

function BibModal({ participant, onClose }: { participant: AdminRegistrationRow | null; onClose: () => void }) {
  const { run, pending } = useAdminRun();
  const [bib, setBib] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setBib(participant?.bib === "—" ? "" : (participant?.bib ?? ""));
    setError("");
  }, [participant]);

  function save() {
    if (!participant) return;
    const v = bib.trim();
    if (!/^\d{1,6}$/.test(v)) return setError("O dorsal deve ter apenas números (até 6 dígitos).");
    // O servidor recusa dorsais já usados no evento e diz por quem
    run({ type: "participant.update", id: participant.id, patch: { bib: v } }, "Dorsal actualizado", (res) => res.ok && onClose());
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
          <Button onClick={save} disabled={pending}>
            {pending ? "A guardar…" : "Guardar"}
          </Button>
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
