"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Download, FileSpreadsheet, Globe, ListPlus, Plus, Timer, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { RESULT_STATUS, formatDate } from "@/lib/format";
import type { RaceResult, ResultStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { importResults, previewResultsImport, type ImportPreview } from "@/server/actions/results";
import { downloadFile, normalize, toCsv, uid, useAdmin } from "./admin-store";
import { ConfirmModal, FilterSelect, PageTitle, SearchInput, TableWrap, Toggle, td, th } from "./admin-ui";

const TIME_RE = /^\d{1,2}:\d{2}:\d{2}$/;

function normTime(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (/^\d{1,2}:\d{2}$/.test(t)) return `00:${t.padStart(5, "0")}`;
  if (TIME_RE.test(t)) return t.padStart(8, "0");
  return null;
}

/* ---------- Componente ---------- */

export function ResultsManager() {
  const { data, replaceWhere, update, remove, create, setResultsPublished } = useAdmin();
  const toast = useToast();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();

  const sortedEvents = useMemo(() => [...data.events].sort((a, b) => b.date.localeCompare(a.date)), [data.events]);
  const defaultEvent = useMemo(
    () => sortedEvents.find((e) => data.results.some((r) => r.eventSlug === e.slug)) ?? sortedEvents.find((e) => e.status === "terminado") ?? sortedEvents[0],
    [sortedEvents], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [eventSlug, setEventSlug] = useState(defaultEvent?.slug ?? "");
  const event = data.events.find((e) => e.slug === eventSlug);
  const [distanceId, setDistanceId] = useState(event?.distances[0]?.id ?? "");
  const distance = event?.distances.find((d) => d.id === distanceId);
  const [q, setQ] = useState("");
  const [preview, setPreview] = useState<(ImportPreview & { fileName: string; csv: string }) | null>(null);
  const [clear, setClear] = useState(false);

  useEffect(() => {
    if (event && !event.distances.some((d) => d.id === distanceId)) setDistanceId(event.distances[0]?.id ?? "");
  }, [event, distanceId]);

  const match = (r: RaceResult) => r.eventSlug === eventSlug && r.distanceId === distanceId;
  const results = useMemo(
    () =>
      data.results
        .filter((r) => r.eventSlug === eventSlug && r.distanceId === distanceId)
        .sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9) || a.bib.localeCompare(b.bib, undefined, { numeric: true })),
    [data.results, eventSlug, distanceId],
  );
  const shown = useMemo(() => {
    const n = normalize(q.trim());
    return n ? results.filter((r) => normalize(`${r.name} ${r.bib} ${r.club}`).includes(n)) : results;
  }, [results, q]);

  const published = data.publishedResults.includes(eventSlug);
  const eventResultCount = data.results.filter((r) => r.eventSlug === eventSlug).length;

  // 10.1: o ficheiro é validado no servidor (pré-visualização) e só é gravado depois de confirmar
  function onFile(f: File) {
    if (!distance) return;
    startTransition(async () => {
      const csv = await f.text();
      const res = await previewResultsImport({ eventSlug, distanceCode: distance.id, csv }).catch(() => null);
      if (!res) return toast({ tone: "error", title: "Não foi possível ler o ficheiro", description: "Verifique a ligação à internet e tente de novo." });
      if (!res.ok) return toast({ tone: "error", title: "Ficheiro recusado", description: res.error });
      setPreview({ ...res.preview, fileName: f.name, csv });
    });
  }

  function applyImport() {
    if (!preview || !distance) return;
    startTransition(async () => {
      const res = await importResults({ eventSlug, distanceCode: distance.id, csv: preview.csv }).catch(() => null);
      if (!res?.ok) return toast({ tone: "error", title: "Resultados não importados", description: res?.error ?? "Verifique a ligação à internet e tente de novo." });
      setPreview(null);
      toast({ title: "Resultados importados", description: res.message });
      router.refresh();
    });
  }

  function fromParticipants() {
    if (!distance) return;
    const existing = new Set(results.map((r) => r.bib));
    const add = data.participants
      .filter((p) => p.eventSlug === eventSlug && p.distanceId === distanceId && p.paymentStatus === "confirmado" && p.bib && !existing.has(p.bib))
      .map(
        (p): RaceResult => ({
          id: uid("rs"),
          eventSlug,
          distanceId,
          bib: p.bib,
          name: p.name,
          gender: p.gender,
          ageGroup: p.ageGroup,
          club: p.club,
          nationality: p.nationality,
          position: null,
          positionGender: null,
          positionAgeGroup: null,
          chipTime: null,
          gunTime: null,
          pace: null,
          status: "nao-partiu",
          splits: [],
        }),
      );
    if (!add.length) return toast({ tone: "info", title: "Nada a acrescentar", description: "Todos os inscritos pagos já estão na lista." });
    replaceWhere("results", match, [...results, ...add]);
    toast({ title: "Lista criada a partir das inscrições", description: `${add.length} atletas adicionados. Preencha os tempos.` });
  }

  function addRow() {
    create("results", {
      id: uid("rs"),
      eventSlug,
      distanceId,
      bib: "",
      name: "",
      gender: "M",
      ageGroup: "Sénior",
      club: "Individual",
      nationality: "Angola",
      position: null,
      positionGender: null,
      positionAgeGroup: null,
      chipTime: null,
      gunTime: null,
      pace: null,
      status: "terminou",
      splits: [],
    });
  }

  function template() {
    downloadFile(
      "modelo-resultados.csv",
      toCsv([
        ["bib", "name", "gender", "ageGroup", "club", "chipTime", "gunTime", "status"],
        ["1001", "Manuel dos Santos", "M", "Sénior", "Petro de Luanda", "00:32:15", "00:32:20", "terminou"],
        ["1002", "Ana Fernandes", "F", "Veterano 35", "Individual", "00:41:03", "00:41:30", "terminou"],
        ["1003", "Paulo Neto", "M", "Júnior", "Individual", "", "", "desistiu"],
      ]),
    );
  }

  return (
    <>
      <PageTitle
        title="Resultados"
        description="Importe, corrija e publique as classificações de cada prova. As posições são recalculadas sempre que grava."
        actions={
          <Button variant="ghost" size="sm" onClick={template}>
            <Download /> Modelo CSV
          </Button>
        }
      />

      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <FilterSelect value={eventSlug} onChange={setEventSlug} label="Escolher evento">
          {sortedEvents.map((e) => (
            <option key={e.id} value={e.slug}>
              {e.title} — {formatDate(e.date)}
            </option>
          ))}
        </FilterSelect>
        <FilterSelect value={distanceId} onChange={setDistanceId} label="Escolher distância">
          {event?.distances.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </FilterSelect>
      </div>

      {event && (
        <div className="mb-4 flex flex-col gap-4 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", published ? "bg-emerald-50 text-emerald-600" : "bg-ink-100 text-ink-500")}>
              <Globe className="size-5" />
            </span>
            <div>
              <p className="font-semibold text-ink-900">
                {published ? "Resultados publicados no site" : "Resultados não publicados"}
                <Badge tone={published ? "green" : "gray"} className="ml-2 align-middle">
                  {eventResultCount} registos
                </Badge>
              </p>
              <p className="text-sm text-ink-500">{published ? "Os atletas já podem consultar as classificações deste evento." : "Só a equipa de gestão vê estes resultados."}</p>
            </div>
          </div>
          <Toggle
            checked={published}
            label="Publicar resultados"
            onChange={(v) => {
              if (v && eventResultCount === 0) return toast({ tone: "error", title: "Sem resultados para publicar", description: "Importe ou introduza os tempos primeiro." });
              setResultsPublished(eventSlug, v);
              toast({ title: v ? "Resultados publicados" : "Resultados retirados do site", description: event.title });
            }}
          />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <SearchInput value={q} onChange={setQ} placeholder="Pesquisar atleta ou dorsal" className="lg:w-80" />
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!distance || pending}>
            <Upload /> {pending && !preview ? "A verificar…" : "Importar ficheiro (CSV)"}
          </Button>
          <Button variant="outline" size="sm" onClick={fromParticipants} disabled={!distance}>
            <ListPlus /> A partir das inscrições
          </Button>
          <Button variant="outline" size="sm" onClick={addRow} disabled={!distance}>
            <Plus /> Linha
          </Button>
          {results.length > 0 && (
            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => setClear(true)}>
              <Trash2 /> Limpar
            </Button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<Timer />}
          title="Ainda não há resultados nesta distância"
          description="Importe o ficheiro CSV da cronometragem (colunas bib, name, gender, ageGroup, club, chipTime, gunTime, status) ou crie a lista a partir das inscrições."
          action={
            <Button onClick={() => fileRef.current?.click()} disabled={!distance || pending}>
              <FileSpreadsheet /> Importar CSV
            </Button>
          }
        />
      ) : (
        <TableWrap>
          <table className="w-full min-w-[1000px]">
            <thead className="bg-ink-50">
              <tr>
                <th className={th}>Pos.</th>
                <th className={th}>Sexo / Esc.</th>
                <th className={th}>Dorsal</th>
                <th className={th}>Atleta</th>
                <th className={th}>Tempo chip</th>
                <th className={th}>Tempo oficial</th>
                <th className={th}>Ritmo</th>
                <th className={th}>Estado</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100">
              {shown.map((r) => (
                <ResultRow key={r.id} r={r} onChange={(patch) => update("results", r.id, patch)} onRemove={() => remove("results", r.id)} />
              ))}
            </tbody>
          </table>
        </TableWrap>
      )}

      <Modal
        open={!!preview}
        onClose={() => !pending && setPreview(null)}
        title="Importar resultados"
        description={preview ? `${preview.fileName} → ${distance?.name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setPreview(null)} disabled={pending}>
              Cancelar
            </Button>
            <Button onClick={applyImport} disabled={!preview?.total || pending}>
              {pending ? "A gravar…" : `Importar ${preview?.total ?? 0} linhas`}
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
              <PreviewStat value={preview.total} label="linhas válidas" />
              <PreviewStat value={preview.finishers} label="terminaram" />
              <PreviewStat value={preview.linked} label="ligadas a inscrições" />
              <PreviewStat value={preview.errors.length} label="linhas com erros" bad={preview.errors.length > 0} />
            </div>
            {preview.errors.length > 0 && (
              <div>
                <p className="mb-1 text-sm font-semibold text-red-800">Estas linhas ficam de fora:</p>
                <ul className="max-h-36 space-y-1 overflow-y-auto rounded-xl bg-red-50 p-3 text-sm text-red-800">
                  {preview.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
            )}
            {preview.warnings.length > 0 && (
              <ul className="max-h-28 space-y-1 overflow-y-auto rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                {preview.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
            {preview.sample.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-ink-200/70">
                <table className="w-full text-sm">
                  <thead className="bg-ink-50 text-left text-xs text-ink-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Dorsal</th>
                      <th className="px-3 py-2">Atleta</th>
                      <th className="px-3 py-2">Sexo / Esc.</th>
                      <th className="px-3 py-2">Tempo</th>
                      <th className="px-3 py-2">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-100">
                    {preview.sample.map((r) => (
                      <tr key={r.line}>
                        <td className="tabular px-3 py-2 font-semibold">{r.bib}</td>
                        <td className="px-3 py-2">
                          {r.name} {r.linked && <CheckCircle2 className="inline size-3.5 text-emerald-600" aria-label="Ligado à inscrição" />}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap text-ink-600">{r.gender} · {r.ageGroup}</td>
                        <td className="tabular px-3 py-2">{r.time ?? "—"}</td>
                        <td className="px-3 py-2 text-ink-600">{RESULT_STATUS[r.status.replace(/_/g, "-") as ResultStatus]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.total > preview.sample.length && <p className="border-t border-ink-100 px-3 py-2 text-xs text-ink-500">… e mais {preview.total - preview.sample.length} linhas.</p>}
              </div>
            )}
            {preview.replacing > 0 && preview.total > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Os {preview.replacing} resultados existentes em {distance?.name} serão substituídos. As classificações são calculadas automaticamente.
              </p>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal
        open={clear}
        onClose={() => setClear(false)}
        title="Apagar resultados desta distância?"
        description={`Serão eliminados ${results.length} resultados de ${distance?.name ?? ""}.`}
        confirmLabel="Apagar resultados"
        onConfirm={() => {
          replaceWhere("results", match, []);
          toast({ title: "Resultados apagados" });
        }}
      />
    </>
  );
}

function PreviewStat({ value, label, bad }: { value: number; label: string; bad?: boolean }) {
  return (
    <div className={cn("rounded-xl p-3", bad ? "bg-red-50" : "bg-ink-50")}>
      <p className={cn("tabular text-2xl font-extrabold", bad ? "text-red-700" : "text-ink-900")}>{value}</p>
      <p className="text-xs text-ink-500">{label}</p>
    </div>
  );
}

const cellInput =
  "h-9 w-full rounded-lg border border-transparent bg-transparent px-2 text-sm text-ink-900 hover:border-ink-200 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/15 focus:outline-none aria-invalid:border-red-500";

function TimeCell({ value, onCommit, label }: { value: string | null; onCommit: (v: string | null) => void; label: string }) {
  const [v, setV] = useState(value ?? "");
  const [bad, setBad] = useState(false);
  useEffect(() => setV(value ?? ""), [value]);
  return (
    <input
      value={v}
      onChange={(e) => {
        setV(e.target.value);
        setBad(false);
      }}
      onBlur={() => {
        const n = normTime(v);
        if (v.trim() && !n) return setBad(true);
        if (n !== value) onCommit(n);
        setV(n ?? "");
      }}
      placeholder="hh:mm:ss"
      aria-label={label}
      aria-invalid={bad}
      title={bad ? "Formato inválido: use HH:MM:SS" : undefined}
      className={cn(cellInput, "tabular w-28")}
    />
  );
}

function TextCell({ value, onCommit, label, className }: { value: string; onCommit: (v: string) => void; label: string; className?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return <input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== value && onCommit(v.trim())} aria-label={label} className={cn(cellInput, className)} />;
}

function ResultRow({ r, onChange, onRemove }: { r: RaceResult; onChange: (p: Partial<RaceResult>) => void; onRemove: () => void }) {
  // Ao alterar um tempo/estado as posições deixam de estar válidas até recalcular
  const touch = (p: Partial<RaceResult>) => onChange({ ...p, position: null, positionGender: null, positionAgeGroup: null });
  return (
    <tr className="hover:bg-ink-50/60">
      <td className={`${td} tabular font-bold text-ink-900`}>{r.position ?? "—"}</td>
      <td className={`${td} tabular text-xs whitespace-nowrap text-ink-500`}>
        {r.gender} {r.positionGender ?? "—"} · {r.ageGroup} {r.positionAgeGroup ?? "—"}
      </td>
      <td className="px-2 py-2">
        <TextCell value={r.bib} onCommit={(bib) => onChange({ bib })} label="Dorsal" className="tabular w-20 font-semibold" />
      </td>
      <td className="px-2 py-2">
        <TextCell value={r.name} onCommit={(name) => onChange({ name })} label="Nome" className="min-w-44 font-semibold" />
        <p className="truncate px-2 text-xs text-ink-500">{r.club}</p>
      </td>
      <td className="px-2 py-2">
        <TimeCell value={r.chipTime} onCommit={(chipTime) => touch({ chipTime, status: chipTime ? "terminou" : r.status })} label="Tempo chip" />
      </td>
      <td className="px-2 py-2">
        <TimeCell value={r.gunTime} onCommit={(gunTime) => touch({ gunTime })} label="Tempo oficial" />
      </td>
      <td className={`${td} tabular whitespace-nowrap`}>{r.pace ? `${r.pace} /km` : "—"}</td>
      <td className="px-2 py-2">
        <select
          value={r.status}
          onChange={(e) => {
            const status = e.target.value as ResultStatus;
            touch(status === "terminou" ? { status } : { status, chipTime: null, gunTime: null, pace: null });
          }}
          aria-label="Estado"
          className={cn(cellInput, "w-40 cursor-pointer")}
        >
          {(Object.keys(RESULT_STATUS) as ResultStatus[]).map((s) => (
            <option key={s} value={s}>
              {RESULT_STATUS[s]}
            </option>
          ))}
        </select>
      </td>
      <td className="px-2 py-2 text-right">
        <button onClick={onRemove} className="rounded-lg p-2 text-ink-400 hover:bg-red-50 hover:text-red-600" aria-label={`Remover ${r.name}`}>
          <Trash2 className="size-4" />
        </button>
      </td>
    </tr>
  );
}
