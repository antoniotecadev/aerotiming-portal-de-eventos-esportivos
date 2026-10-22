"use client";

import { Fragment, useState } from "react";
import { Award, ChevronDown, Clock, Download, Flag, Medal, RotateCcw, SearchX, Timer, UserX, Users } from "lucide-react";
import type { Gender, RaceResult } from "@/lib/types";
import type { ResultsView } from "@/server/queries/results";
import type { ParticipantsView } from "@/server/queries/registrations";
import { formatDate, formatKm, GENDER_LABEL, RESULT_STATUS } from "@/lib/format";
import { useUrlFilters } from "@/lib/use-url-filters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonClasses } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { Pager, SearchBox } from "@/components/ui/pager";
import { Tabs } from "@/components/ui/tabs";
import { ParticipantsTable } from "@/components/events/participants-table";

export interface ResultsEventInfo {
  slug: string;
  title: string;
  date: string;
  place: string;
  distances: { id: string; name: string; distanceKm: number }[];
}

const AGE_ORDER = ["Júnior", "Sénior", "Veterano 35", "Veterano 45", "Veterano 55+"];
const sortGroups = (list: string[]) => [...new Set(list)].sort((a, b) => (AGE_ORDER.indexOf(a) + 1 || 99) - (AGE_ORDER.indexOf(b) + 1 || 99) || a.localeCompare(b));

const STATUS_TONE = { terminou: "green", desistiu: "amber", desclassificado: "red", "nao-partiu": "gray" } as const;

type Tab = "resultados" | "inscritos";

/** Resultados e inscritos de um evento. Filtros e páginas vêm do servidor (5.10) e ficam no URL. */
export function EventResults({
  event,
  tab,
  counts,
  results,
  participants,
}: {
  event: ResultsEventInfo;
  tab: Tab;
  counts: { finishers: number; participants: number };
  results?: ResultsView;
  participants?: ParticipantsView;
}) {
  const { set } = useUrlFilters();
  return (
    <div className="space-y-6">
      <Tabs<Tab>
        value={tab}
        onChange={(t) => set({ separador: t === "resultados" ? null : t, q: null, sexo: null, escalao: null, pagamento: null })}
        items={[
          { id: "resultados", label: "Resultados", icon: <Award />, count: counts.finishers },
          { id: "inscritos", label: "Inscritos", icon: <Users />, count: counts.participants },
        ]}
      />
      {tab === "resultados" && results ? (
        <ResultsPanel event={event} view={results} />
      ) : participants ? (
        <ParticipantsTable view={participants} distances={event.distances} />
      ) : null}
    </div>
  );
}

/* ---------- Resultados ---------- */

function ResultsPanel({ event, view }: { event: ResultsEventInfo; view: ResultsView }) {
  const { params, set, hrefFor, pending } = useUrlFilters();
  const q = params.get("q") ?? "";
  const gender = params.get("sexo") ?? "";
  const group = params.get("escalao") ?? "";
  const [open, setOpen] = useState<string | null>(null);
  const [cert, setCert] = useState<RaceResult | null>(null);

  const distance = view.distance;
  const dist = event.distances.find((d) => d.id === distance) ?? event.distances[0];
  const groups = sortGroups(view.ageGroups);
  const hasFilters = Boolean(q || gender || group);
  const { summary, rows } = view;

  function changeDistance(id: string) {
    setOpen(null);
    set({ distancia: id, escalao: null });
  }

  const clear = () => set({ q: null, sexo: null, escalao: null });

  return (
    <div className="space-y-8">
      {event.distances.length > 1 && (
        <div>
          <p className="mb-2 text-sm font-semibold text-ink-800">Escolha a distância</p>
          <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0" role="tablist">
            {event.distances.map((d) => (
              <button
                key={d.id}
                role="tab"
                aria-selected={d.id === distance}
                onClick={() => changeDistance(d.id)}
                className={cn(
                  "inline-flex h-12 shrink-0 items-center gap-2 rounded-xl border px-4 text-[15px] font-semibold transition-colors",
                  d.id === distance ? "border-brand-600 bg-brand-600 text-white shadow-sm" : "border-ink-200 bg-white text-ink-700 hover:border-ink-300",
                )}
              >
                <Flag className="size-4" /> {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={<Users />} label="Inscritos" value={summary.registered} />
        <Stat icon={<Flag />} label="Terminaram" value={summary.finishers} tone="green" />
        <Stat icon={<UserX />} label="Desistências" value={summary.dnf} tone="amber" />
        <Stat icon={<Timer />} label="Melhor tempo" value={summary.best ?? "—"} tone="brand" />
      </div>

      {/* Pódio */}
      {summary.finishers > 0 && (
        <section aria-labelledby="podio">
          <h2 id="podio" className="mb-4 flex items-center gap-2 text-xl font-extrabold text-ink-900">
            <Medal className="size-6 text-brandnd-500" /> Pódio · {dist.name}
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {(["M", "F"] as Gender[]).map((g) => (
              <Podium key={g} title={GENDER_LABEL[g]} top={view.podium[g]} />
            ))}
          </div>
        </section>
      )}

      {/* Classificação */}
      <section aria-labelledby="classificacao" className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 id="classificacao" className="text-xl font-extrabold text-ink-900">Classificação completa</h2>
          {summary.inDistance > 0 && (
            <a href={`/api/resultados/${event.slug}/csv?distancia=${encodeURIComponent(distance)}`} download className={buttonClasses("outline")}>
              <Download /> Descarregar (CSV)
            </a>
          )}
        </div>

        <div className="grid gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:grid-cols-[1fr_180px_200px] sm:p-5">
          <SearchBox value={q} onSearch={(v) => set({ q: v })} placeholder="Nome, dorsal ou clube" label="Procurar por nome, dorsal ou clube" />
          <Select value={gender} onChange={(e) => set({ sexo: e.target.value })} aria-label="Sexo">
            <option value="">Masculino e feminino</option>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </Select>
          <Select value={group} onChange={(e) => set({ escalao: e.target.value })} aria-label="Escalão">
            <option value="">Todos os escalões</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3 text-sm text-ink-600">
          <p>
            {view.matching === 1 ? "1 atleta" : `${view.matching} atletas`}
            {hasFilters && ` (de ${summary.inDistance})`}
          </p>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clear}>
              <RotateCcw /> Limpar filtros
            </Button>
          )}
        </div>

        <div className={cn("space-y-4 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
          {rows.length === 0 ? (
            <EmptyState
              icon={<SearchX />}
              title="Não encontrámos nenhum atleta"
              description="Confirme o nome ou o número do dorsal. Também pode experimentar outra distância."
              action={<Button variant="outline" onClick={clear}><RotateCcw /> Limpar filtros</Button>}
            />
          ) : (
            <>
              {/* Tabela (ecrãs grandes) */}
              <div className="hidden overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card lg:block">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-left text-xs font-bold tracking-wide text-ink-500 uppercase">
                    <tr>
                      <th className="px-3 py-3">Pos.</th>
                      <th className="px-3 py-3">Dorsal</th>
                      <th className="px-3 py-3">Nome</th>
                      <th className="px-3 py-3">Sexo</th>
                      <th className="px-3 py-3">Escalão</th>
                      <th className="px-3 py-3">Clube</th>
                      <th className="px-3 py-3">Tempo chip</th>
                      <th className="px-3 py-3">Tempo oficial</th>
                      <th className="px-3 py-3">Ritmo</th>
                      <th className="px-3 py-3" title="Posição no sexo">Pos. sexo</th>
                      <th className="px-3 py-3" title="Posição no escalão">Pos. esc.</th>
                      <th className="px-3 py-3">Estado</th>
                      <th className="px-2 py-3"><span className="sr-only">Detalhes</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {rows.map((r) => {
                      const isOpen = open === r.id;
                      return (
                        <Fragment key={r.id}>
                          <tr
                            onClick={() => setOpen(isOpen ? null : r.id)}
                            className={cn("cursor-pointer transition-colors hover:bg-ink-50", isOpen && "bg-brand-50/60 hover:bg-brand-50/60")}
                          >
                            <td className="px-3 py-3"><PositionBadge position={r.position} /></td>
                            <td className="tabular px-3 py-3 font-semibold text-ink-700">{r.bib}</td>
                            <td className="px-3 py-3">
                              <p className="font-semibold text-ink-900">{r.name}</p>
                              <p className="text-xs text-ink-500">{r.nationality}</p>
                            </td>
                            <td className="px-3 py-3 text-ink-700">{r.gender}</td>
                            <td className="px-3 py-3 whitespace-nowrap text-ink-700">{r.ageGroup}</td>
                            <td className="max-w-40 truncate px-3 py-3 text-ink-700" title={r.club}>{r.club}</td>
                            <td className="tabular px-3 py-3 font-bold text-ink-900">{r.chipTime ?? "—"}</td>
                            <td className="tabular px-3 py-3 text-ink-600">{r.gunTime ?? "—"}</td>
                            <td className="tabular px-3 py-3 whitespace-nowrap text-ink-600">{r.pace ? `${r.pace} /km` : "—"}</td>
                            <td className="tabular px-3 py-3 text-ink-700">{r.positionGender ?? "—"}</td>
                            <td className="tabular px-3 py-3 text-ink-700">{r.positionAgeGroup ?? "—"}</td>
                            <td className="px-3 py-3"><Badge tone={STATUS_TONE[r.status]}>{RESULT_STATUS[r.status]}</Badge></td>
                            <td className="px-2 py-3">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpen(isOpen ? null : r.id);
                                }}
                                aria-expanded={isOpen}
                                aria-label={isOpen ? "Esconder detalhes" : "Ver detalhes"}
                                className="flex size-9 items-center justify-center rounded-lg text-ink-500 hover:bg-ink-100"
                              >
                                <ChevronDown className={cn("size-5 transition-transform", isOpen && "rotate-180")} />
                              </button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-brand-50/60">
                              <td colSpan={13} className="px-4 pb-4">
                                <ResultDetails result={r} onCertificate={() => setCert(r)} />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Cartões (telemóvel e tablet) */}
              <ul className="space-y-3 lg:hidden">
                {rows.map((r) => {
                  const isOpen = open === r.id;
                  return (
                    <li key={r.id} className={cn("rounded-2xl border bg-white p-4 shadow-card", isOpen ? "border-brand-300" : "border-ink-200/70")}>
                      <div className="flex items-start gap-3">
                        <PositionBadge position={r.position} large />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold text-ink-900">{r.name}</p>
                          <p className="truncate text-sm text-ink-500">
                            Dorsal <strong className="text-ink-700">{r.bib}</strong> · {GENDER_LABEL[r.gender]} · {r.ageGroup}
                          </p>
                          <p className="truncate text-sm text-ink-500">{r.club} · {r.nationality}</p>
                        </div>
                        {r.status !== "terminou" && <Badge tone={STATUS_TONE[r.status]}>{RESULT_STATUS[r.status]}</Badge>}
                      </div>
                      {r.status === "terminou" && (
                        <dl className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-ink-50 p-3 text-sm sm:grid-cols-4">
                          <Mini label="Tempo chip" value={r.chipTime} strong />
                          <Mini label="Ritmo" value={r.pace ? `${r.pace} /km` : null} />
                          <Mini label="Pos. sexo" value={r.positionGender} />
                          <Mini label="Pos. escalão" value={r.positionAgeGroup} />
                        </dl>
                      )}
                      {r.status === "terminou" && (
                        <Button variant="ghost" className="mt-2 w-full" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen}>
                          {isOpen ? "Esconder detalhes" : "Ver parciais e certificado"}
                          <ChevronDown className={cn("transition-transform", isOpen && "rotate-180")} />
                        </Button>
                      )}
                      {isOpen && <ResultDetails result={r} onCertificate={() => setCert(r)} />}
                    </li>
                  );
                })}
              </ul>

              <Pager page={view.page} pages={view.pages} hrefFor={hrefFor} />
            </>
          )}
        </div>
      </section>

      <CertificateModal result={cert} event={event} distanceName={dist.name} distanceKm={dist.distanceKm} onClose={() => setCert(null)} />
    </div>
  );
}

function Stat({ icon, label, value, tone = "ink" }: { icon: React.ReactNode; label: string; value: React.ReactNode; tone?: "ink" | "green" | "amber" | "brand" }) {
  const tones = { ink: "bg-ink-100 text-ink-600", green: "bg-emerald-50 text-emerald-600", amber: "bg-amber-50 text-amber-600", brand: "bg-brand-50 text-brand-600" };
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card">
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl [&_svg]:size-5", tones[tone])}>{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-ink-500">{label}</p>
        <p className="tabular font-display text-2xl leading-tight font-extrabold text-ink-900 sm:text-3xl">{value}</p>
      </div>
    </div>
  );
}

const MEDALS = {
  1: { label: "Ouro", ring: "from-sun-300 to-sun-500 text-ink-900", bar: "h-28 bg-gradient-to-b from-sun-300/70 to-sun-400/30" },
  2: { label: "Prata", ring: "from-ink-200 to-ink-400 text-ink-900", bar: "h-20 bg-gradient-to-b from-ink-200 to-ink-100" },
  3: { label: "Bronze", ring: "from-amber-500 to-amber-800 text-white", bar: "h-14 bg-gradient-to-b from-amber-200/80 to-amber-100/50" },
} as const;

function Podium({ title, top }: { title: string; top: RaceResult[] }) {
  // Ordem visual: 2.º, 1.º, 3.º
  const order = [top[1], top[0], top[2]];
  return (
    <div className="rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:p-5">
      <h3 className="mb-4 text-base font-bold text-ink-900">{title}</h3>
      {top.length === 0 ? (
        <p className="text-sm text-ink-500">Sem atletas classificados.</p>
      ) : (
        <div className="grid grid-cols-3 items-end gap-2 sm:gap-3">
          {order.map((r, i) => {
            if (!r) return <div key={i} />;
            const place = (r.positionGender ?? 1) as 1 | 2 | 3;
            const m = MEDALS[place];
            return (
              <div key={r.id} className="flex min-w-0 flex-col items-center text-center">
                <span
                  className={cn("mb-2 flex items-center justify-center rounded-full bg-gradient-to-br font-display font-extrabold shadow-md ring-4 ring-white", m.ring, place === 1 ? "size-14 text-2xl" : "size-12 text-xl")}
                  aria-label={`Medalha de ${m.label}`}
                >
                  {place}
                </span>
                <p className="line-clamp-2 text-sm leading-tight font-bold text-ink-900">{r.name}</p>
                <p className="mt-0.5 truncate text-xs text-ink-500">{r.club}</p>
                <div className={cn("mt-2 flex w-full flex-col items-center justify-start rounded-t-xl pt-2", m.bar)}>
                  <span className="tabular text-sm font-bold text-ink-900">{r.chipTime}</span>
                  <span className="text-[11px] font-semibold text-ink-600">{m.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PositionBadge({ position, large }: { position: number | null; large?: boolean }) {
  const medal = position && position <= 3 ? MEDALS[position as 1 | 2 | 3] : null;
  return (
    <span
      className={cn(
        "tabular inline-flex shrink-0 items-center justify-center rounded-full font-bold",
        large ? "size-11 text-base" : "size-8 text-sm",
        medal ? cn("bg-gradient-to-br", medal.ring) : position ? "bg-ink-100 text-ink-800" : "bg-ink-50 text-ink-400",
      )}
    >
      {position ?? "—"}
    </span>
  );
}

function Mini({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className={cn("tabular", strong ? "text-base font-bold text-ink-900" : "font-semibold text-ink-700")}>{value ?? "—"}</dd>
    </div>
  );
}

function ResultDetails({ result: r, onCertificate }: { result: RaceResult; onCertificate: () => void }) {
  return (
    <div className="mt-3 flex flex-col gap-4 rounded-xl border border-brand-100 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-ink-800"><Clock className="size-4 text-ink-400" /> Tempos de passagem</p>
        {r.splits.length === 0 ? (
          <p className="text-sm text-ink-500">Sem tempos de passagem.</p>
        ) : (
          <ol className="flex flex-wrap gap-2">
            {r.splits.map((s) => (
              <li key={s.label} className="rounded-lg bg-ink-50 px-3 py-2 text-sm">
                <span className="block text-xs text-ink-500">{s.label}</span>
                <span className="tabular font-bold text-ink-900">{s.time}</span>
              </li>
            ))}
            <li className="rounded-lg bg-brand-50 px-3 py-2 text-sm">
              <span className="block text-xs text-brand-700">Chegada</span>
              <span className="tabular font-bold text-ink-900">{r.chipTime}</span>
            </li>
          </ol>
        )}
        <p className="mt-2 text-xs text-ink-500 lg:hidden">Tempo oficial (desde o tiro de partida): <span className="tabular font-semibold">{r.gunTime ?? "—"}</span></p>
      </div>
      {r.status === "terminou" && (
        <Button onClick={onCertificate} className="w-full sm:w-auto">
          <Award /> Certificado
        </Button>
      )}
    </div>
  );
}

function CertificateModal({
  result: r,
  event,
  distanceName,
  distanceKm,
  onClose,
}: {
  result: RaceResult | null;
  event: ResultsEventInfo;
  distanceName: string;
  distanceKm: number;
  onClose: () => void;
}) {
  return (
    <Modal
      open={Boolean(r)}
      onClose={onClose}
      title="Certificado de participação"
      description="Descarregue o certificado em PDF (A4), pronto a imprimir ou partilhar."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Fechar</Button>
          {/* PDF gerado no servidor (10.5) — src/app/api/certificados/[id]/route.ts */}
          <a href={r ? `/api/certificados/${r.id}?download=1` : undefined} download className={buttonClasses()}>
            <Download /> Descarregar PDF
          </a>
        </>
      }
    >
      {r && (
        <div className="p-4 sm:p-6">
          <div className="relative overflow-hidden rounded-2xl border-[6px] border-double border-brand-500 bg-gradient-to-br from-white via-white to-brand-50 px-6 py-8 text-center sm:px-10 sm:py-10">
            <div className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-brand-300/30" aria-hidden />
            <div className="pointer-events-none absolute -bottom-20 -left-20 size-56 rounded-full bg-brand-200/30" aria-hidden />
            <div className="relative">
              <p className="text-sm font-extrabold tracking-[0.3em] text-brand-600 uppercase">ConexãoSport</p>
              <h3 className="mt-2 font-display text-3xl font-extrabold tracking-wide text-ink-900 uppercase sm:text-4xl">Certificado de Finisher</h3>
              <p className="mt-4 text-ink-600">Certificamos que</p>
              <p className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">{r.name}</p>
              <p className="mt-1 text-sm text-ink-500">Dorsal {r.bib} · {r.club}</p>
              <p className="mx-auto mt-4 max-w-lg text-ink-700">
                concluiu a prova <strong>{distanceName}</strong> ({formatKm(distanceKm)}) do evento <strong>{event.title}</strong>, realizado a {formatDate(event.date)}, em {event.place}.
              </p>
              <div className="mx-auto mt-6 grid max-w-xl grid-cols-2 gap-3 sm:grid-cols-4">
                <CertBox label="Tempo chip" value={r.chipTime} big />
                <CertBox label="Classificação geral" value={r.position ? `${r.position}.º` : "—"} />
                <CertBox label={`Pos. ${r.gender === "M" ? "masculina" : "feminina"}`} value={r.positionGender ? `${r.positionGender}.º` : "—"} />
                <CertBox label={r.ageGroup} value={r.positionAgeGroup ? `${r.positionAgeGroup}.º` : "—"} />
              </div>
              <p className="mt-6 text-xs text-ink-500">Ritmo médio: {r.pace} min/km · Tempo oficial: {r.gunTime}</p>
              <div className="mx-auto mt-6 w-48 border-t border-ink-300 pt-2 text-xs text-ink-500">Cronometragem oficial ConexãoSport</div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CertBox({ label, value, big }: { label: string; value: React.ReactNode; big?: boolean }) {
  return (
    <div className={cn("rounded-xl px-3 py-2", big ? "bg-ink-900 text-white" : "bg-white ring-1 ring-ink-200")}>
      <p className={cn("text-[11px] font-semibold uppercase", big ? "text-brand-400" : "text-ink-500")}>{label}</p>
      <p className="tabular font-display text-2xl font-extrabold">{value}</p>
    </div>
  );
}
