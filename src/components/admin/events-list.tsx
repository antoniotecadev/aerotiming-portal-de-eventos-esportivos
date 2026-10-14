"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, CalendarPlus, Copy, ExternalLink, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { EVENT_STATUS, formatDate } from "@/lib/format";
import type { EventStatus } from "@/lib/types";
import { type AdminEvent, normalize, uid, useAdmin } from "./admin-store";
import { ConfirmModal, FilterSelect, MenuItem, PageTitle, ProgressBar, RowMenu, SearchInput, TableWrap, td, th } from "./admin-ui";

export function EventsList() {
  const { data, create, remove } = useAdmin();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [category, setCategory] = useState("");
  const [toDelete, setToDelete] = useState<AdminEvent | null>(null);

  const list = useMemo(() => {
    const n = normalize(q.trim());
    return data.events
      .filter((e) => (!n || normalize(`${e.title} ${e.city} ${e.venue} ${e.province}`).includes(n)) && (!status || (status === "rascunho" ? e.draft : e.status === status && !e.draft)) && (!category || e.category === category))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.events, q, status, category]);

  const catName = (slug: string) => data.categories.find((c) => c.slug === slug)?.name ?? slug;

  function duplicate(e: AdminEvent) {
    let slug = `${e.slug}-copia`;
    let i = 2;
    while (data.events.some((x) => x.slug === slug)) slug = `${e.slug}-copia-${i++}`;
    const copy: AdminEvent = {
      ...JSON.parse(JSON.stringify(e)),
      id: uid("ev"),
      slug,
      title: `${e.title} (cópia)`,
      draft: true,
      featured: false,
      createdAt: new Date().toISOString(),
      distances: e.distances.map((d) => ({ ...d, slotsTaken: 0 })),
    };
    create("events", copy);
    toast({ title: "Evento duplicado", description: "A cópia foi guardada como rascunho." });
  }

  return (
    <>
      <PageTitle
        title="Eventos"
        description={`${data.events.length} eventos no total`}
        actions={
          <ButtonLink href="/admin/eventos/novo">
            <CalendarPlus /> Criar evento
          </ButtonLink>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
        <SearchInput value={q} onChange={setQ} placeholder="Pesquisar por título, cidade ou local" />
        <FilterSelect value={status} onChange={setStatus} label="Filtrar por estado">
          <option value="">Todos os estados</option>
          <option value="rascunho">Rascunho</option>
          {(Object.keys(EVENT_STATUS) as EventStatus[]).map((s) => (
            <option key={s} value={s}>
              {EVENT_STATUS[s].label}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={category} onChange={setCategory} label="Filtrar por categoria">
          <option value="">Todas as categorias</option>
          {data.categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </FilterSelect>
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<CalendarDays />} title="Nenhum evento encontrado" description="Ajuste a pesquisa ou os filtros, ou crie um novo evento." />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[860px]">
            <thead className="bg-ink-50">
              <tr>
                <th className={th}>Evento</th>
                <th className={th}>Data</th>
                <th className={th}>Local</th>
                <th className={th}>Estado</th>
                <th className={th}>Vagas preenchidas</th>
                <th className={`${th} text-right`}>Acções</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {list.map((e) => {
                const total = e.distances.reduce((a, d) => a + d.totalSlots, 0);
                const taken = e.distances.reduce((a, d) => a + d.slotsTaken, 0);
                const pct = total ? (taken / total) * 100 : 0;
                return (
                  <tr key={e.id} className="hover:bg-ink-50/60">
                    <td className={td}>
                      <Link href={`/admin/eventos/${e.id}`} className="flex items-center gap-3">
                        <span className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-100">
                          {e.poster && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={e.poster} alt="" className="size-full object-cover" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="block max-w-72 truncate font-semibold text-ink-900 hover:text-brand-700">{e.title}</span>
                          <span className="text-xs text-ink-500">
                            {catName(e.category)} · {e.edition}.ª edição
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className={`${td} whitespace-nowrap`}>
                      {formatDate(e.date)}
                      <span className="block text-xs text-ink-500">{e.startTime}</span>
                    </td>
                    <td className={td}>
                      <span className="block max-w-48 truncate">{e.venue}</span>
                      <span className="text-xs text-ink-500">
                        {e.city}, {e.province}
                      </span>
                    </td>
                    <td className={td}>{e.draft ? <Badge tone="gray">Rascunho</Badge> : <StatusBadge status={e.status} />}</td>
                    <td className={td}>
                      <div className="w-36">
                        <ProgressBar value={pct} />
                        <span className="tabular mt-1 block text-xs text-ink-500">
                          {taken.toLocaleString("pt-PT")} / {total.toLocaleString("pt-PT")}
                        </span>
                      </div>
                    </td>
                    <td className={`${td} text-right`}>
                      <div className="flex items-center justify-end gap-1">
                        <ButtonLink href={`/admin/eventos/${e.id}`} variant="ghost" size="sm" aria-label={`Editar ${e.title}`}>
                          <Pencil /> <span className="hidden xl:inline">Editar</span>
                        </ButtonLink>
                        <RowMenu trigger={<MoreVertical className="size-4" />}>
                          {(close) => (
                            <>
                              <MenuItem icon={<ExternalLink />} onClick={() => (close(), window.open(`/eventos/${e.slug}`, "_blank"))}>
                                Ver no site
                              </MenuItem>
                              <MenuItem icon={<Copy />} onClick={() => (close(), duplicate(e))}>
                                Duplicar
                              </MenuItem>
                              <MenuItem icon={<Trash2 />} danger onClick={() => (close(), setToDelete(e))}>
                                Eliminar
                              </MenuItem>
                            </>
                          )}
                        </RowMenu>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      )}

      <ConfirmModal
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        title="Eliminar evento?"
        description={
          <>
            <strong>{toDelete?.title}</strong> será eliminado do painel. Esta acção não pode ser desfeita.
          </>
        }
        onConfirm={() => {
          if (!toDelete) return;
          remove("events", toDelete.id);
          toast({ title: "Evento eliminado", description: toDelete.title });
        }}
      />
    </>
  );
}
