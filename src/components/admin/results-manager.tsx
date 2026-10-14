"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calculator, Download, FileSpreadsheet, Globe, ListPlus, Plus, Timer, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { RESULT_STATUS, formatDate } from "@/lib/format";
import type { Gender, RaceResult, ResultStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { downloadFile, normalize, toCsv, uid, useAdmin } from "./admin-store";
import { ConfirmModal, FilterSelect, PageTitle, SearchInput, TableWrap, Toggle, td, th } from "./admin-ui";

const TIME_RE = /^\d{1,2}:\d{2}:\d{2}$/;

const toSec = (t: string | null) => {
  if (!t || !TIME_RE.test(t)) return null;
  const [h, m, s] = t.split(":").map(Number);
  return h * 3600 + m * 60 + s;
};

function normTime(v: string): string | null {
  const t = v.trim();
  if (!t) return null;
  if (/^\d{1,2}:\d{2}$/.test(t)) return `00:${t.padStart(5, "0")}`;
  if (TIME_RE.test(t)) return t.padStart(8, "0");
  return null;
}

/** Recalcula posições (geral, sexo, escalão) e ritmo de uma lista de resultados de uma distância. */
export function recompute(list: RaceResult[], km: number): RaceResult[] {
  const finishers = list
    .filter((r) => r.status === "terminou" && toSec(r.chipTime ?? r.gunTime) !== null)
    .sort((a, b) => toSec(a.chipTime ?? a.gunTime)! - toSec(b.chipTime ?? b.gunTime)!);
  const pos = new Map<string, { p: number; g: number; a: number }>();
  const byG: Record<string, number> = {};
  const byA: Record<string, number> = {};
  finishers.forEach((r, i) => {
    byG[r.gender] = (byG[r.gender] ?? 0) + 1;
    const ak = `${r.gender}|${r.ageGroup}`;
    byA[ak] = (byA[ak] ?? 0) + 1;
    pos.set(r.id, { p: i + 1, g: byG[r.gender], a: byA[ak] });
  });
  return list
    .map((r) => {
      const x = pos.get(r.id);
      const sec = toSec(r.chipTime ?? r.gunTime);
      let pace: string | null = null;
      if (x && sec && km > 0) {
        const p = sec / km;
        pace = `${Math.floor(p / 60)}:${String(Math.round(p % 60)).padStart(2, "0")}`;
      }
      return { ...r, position: x?.p ?? null, positionGender: x?.g ?? null, positionAgeGroup: x?.a ?? null, pace };
    })
    .sort((a, b) => (a.position ?? 1e9) - (b.position ?? 1e9) || a.bib.localeCompare(b.bib, undefined, { numeric: true }));
}

/* ---------- CSV ---------- */

function parseCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, "");
  const firstLine = clean.split(/\r?\n/)[0] ?? "";
  const sep = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (quoted) {
      if (c === '"' && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === sep) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && clean[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const STATUS_ALIASES: Record<string, ResultStatus> = {
  terminou: "terminou",
  finished: "terminou",
  ok: "terminou",
  fin: "terminou",
  desistiu: "desistiu",
  dnf: "desistiu",
  desclassificado: "desclassificado",
  dsq: "desclassificado",
  dq: "desclassificado",
  "nao-partiu": "nao-partiu",
  "nao partiu": "nao-partiu",
  dns: "nao-partiu",
};

interface ImportPreview {
  rows: RaceResult[];
  errors: string[];
  fileName: string;
}

function rowsToResults(table: string[][], eventSlug: string, distanceId: string): { rows: RaceResult[]; errors: string[] } {
  const errors: string[] = [];
  if (table.length < 2) return { rows: [], errors: ["O ficheiro não tem linhas de dados."] };
  const header = table[0].map((h) => normalize(h.trim()).replace(/[\s_-]/g, ""));
  const col = (name: string) => header.indexOf(name.toLowerCase());
  const idx = {
    bib: col("bib"),
    name: col("name"),
    gender: col("gender"),
    ageGroup: col("agegroup"),
    club: col("club"),
    chipTime: col("chiptime"),
    gunTime: col("guntime"),
    status: col("status"),
    nationality: col("nationality"),
  };
  if (idx.bib < 0 || idx.name < 0) return { rows: [], errors: ["Cabeçalho inválido: são obrigatórias as colunas bib e name."] };
  const seen = new Set<string>();
  const rows: RaceResult[] = [];
  table.slice(1).forEach((r, i) => {
    const line = i + 2;
    const get = (k: keyof typeof idx) => (idx[k] >= 0 ? (r[idx[k]] ?? "").trim() : "");
    const bib = get("bib");
    const name = get("name");
    if (!bib || !name) return errors.push(`Linha ${line}: falta o dorsal ou o nome.`);
    if (seen.has(bib)) return errors.push(`Linha ${line}: dorsal #${bib} repetido.`);
    seen.add(bib);
    const g = get("gender").toUpperCase();
    const gender: Gender = g.startsWith("F") ? "F" : "M";
    const chipRaw = get("chipTime");
    const gunRaw = get("gunTime");
    const chipTime = normTime(chipRaw);
    const gunTime = normTime(gunRaw);
    if (chipRaw && !chipTime) errors.push(`Linha ${line}: tempo de chip inválido (“${chipRaw}”), use HH:MM:SS.`);
    if (gunRaw && !gunTime) errors.push(`Linha ${line}: tempo oficial inválido (“${gunRaw}”), use HH:MM:SS.`);
    const st = normalize(get("status"));
    const status: ResultStatus = STATUS_ALIASES[st] ?? (chipTime || gunTime ? "terminou" : "nao-partiu");
    rows.push({
      id: uid("rs"),
      eventSlug,
      distanceId,
      bib,
      name,
      gender,
      ageGroup: get("ageGroup") || "Sénior",
      club: get("club") || "Individual",
      nationality: get("nationality") || "Angola",
      position: null,
      positionGender: null,
      positionAgeGroup: null,
      chipTime: status === "terminou" ? chipTime : null,
      gunTime: status === "terminou" ? gunTime : null,
      pace: null,
      status,
      splits: [],
    });
  });
  return { rows, errors };
}

/* ---------- Componente ---------- */

export function ResultsManager() {
  const { data, replaceWhere, update, remove, create, setResultsPublished } = useAdmin();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

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
  const [preview, setPreview] = useState<ImportPreview | null>(null);
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
  const finishers = results.filter((r) => r.status === "terminou").length;
  const needsRecalc = results.some((r) => r.status === "terminou" && toSec(r.chipTime ?? r.gunTime) !== null && r.position === null);

  function recalc(silent = false) {
    if (!distance) return;
    replaceWhere("results", match, recompute(results, distance.distanceKm));
    if (!silent) toast({ title: "Classificações recalculadas", description: `${distance.name} · ${finishers} atletas classificados` });
  }

  function onFile(f: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const { rows, errors } = rowsToResults(parseCsv(String(reader.result ?? "")), eventSlug, distanceId);
      setPreview({ rows, errors, fileName: f.name });
    };
    reader.readAsText(f);
  }

  function applyImport() {
    if (!preview || !distance) return;
    replaceWhere("results", match, recompute(preview.rows, distance.distanceKm));
    toast({ title: "Resultados importados", description: `${preview.rows.length} linhas · ${distance.name}` });
    setPreview(null);
  }

  function fromParticipants() {
    if (!distance) return;
    const existing = new Set(results.map((r) => r.bib));
    const add = data.participants
      .filter((p) => p.eventSlug === eventSlug && p.distanceId === distanceId && p.paymentStatus === "confirmado" && !existing.has(p.bib))
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
        description="Importe, corrija e publique as classificações de cada prova."
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
          <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={!distance}>
            <Upload /> Importar ficheiro (CSV)
          </Button>
          <Button variant="outline" size="sm" onClick={fromParticipants} disabled={!distance}>
            <ListPlus /> A partir das inscrições
          </Button>
          <Button variant="outline" size="sm" onClick={addRow} disabled={!distance}>
            <Plus /> Linha
          </Button>
          <Button size="sm" variant={needsRecalc ? "primary" : "dark"} onClick={() => recalc()} disabled={results.length === 0}>
            <Calculator /> Recalcular classificações
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

      {needsRecalc && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">Há tempos alterados sem classificação. Clique em “Recalcular classificações”.</p>
      )}

      {results.length === 0 ? (
        <EmptyState
          icon={<Timer />}
          title="Ainda não há resultados nesta distância"
          description="Importe o ficheiro CSV da cronometragem (colunas bib, name, gender, ageGroup, club, chipTime, gunTime, status) ou crie a lista a partir das inscrições."
          action={
            <Button onClick={() => fileRef.current?.click()} disabled={!distance}>
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
        onClose={() => setPreview(null)}
        title="Importar resultados"
        description={preview ? `${preview.fileName} → ${distance?.name}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setPreview(null)}>
              Cancelar
            </Button>
            <Button onClick={applyImport} disabled={!preview?.rows.length}>
              Importar {preview?.rows.length ?? 0} linhas
            </Button>
          </>
        }
      >
        {preview && (
          <div className="space-y-4 p-6">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="tabular text-2xl font-extrabold text-ink-900">{preview.rows.length}</p>
                <p className="text-xs text-ink-500">linhas válidas</p>
              </div>
              <div className="rounded-xl bg-ink-50 p-3">
                <p className="tabular text-2xl font-extrabold text-ink-900">{preview.rows.filter((r) => r.status === "terminou").length}</p>
                <p className="text-xs text-ink-500">terminaram</p>
              </div>
              <div className={cn("rounded-xl p-3", preview.errors.length ? "bg-red-50" : "bg-ink-50")}>
                <p className={cn("tabular text-2xl font-extrabold", preview.errors.length ? "text-red-700" : "text-ink-900")}>{preview.errors.length}</p>
                <p className="text-xs text-ink-500">avisos</p>
              </div>
            </div>
            {preview.errors.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl bg-red-50 p-3 text-sm text-red-800">
                {preview.errors.map((e, i) => (
                  <li key={i}>{e}</li>
                ))}
              </ul>
            )}
            {results.length > 0 && preview.rows.length > 0 && (
              <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Os {results.length} resultados existentes nesta distância serão substituídos. As classificações são recalculadas automaticamente.
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
