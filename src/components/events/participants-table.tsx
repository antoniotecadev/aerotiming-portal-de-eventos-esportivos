"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import type { EventDistance, Participant } from "@/lib/types";
import { GENDER_LABEL, PAYMENT_STATUS, formatDateShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";

const PAGE = 30;
const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ParticipantsTable({ participants, distances }: { participants: Participant[]; distances: EventDistance[] }) {
  const [q, setQ] = useState("");
  const [dist, setDist] = useState("");
  const [gender, setGender] = useState("");
  const [pay, setPay] = useState("");
  const [limit, setLimit] = useState(PAGE);

  const rows = useMemo(() => {
    const nq = norm(q.trim());
    return participants
      .filter((p) => (!nq || norm(`${p.name} ${p.bib} ${p.club}`).includes(nq)) && (!dist || p.distanceId === dist) && (!gender || p.gender === gender) && (!pay || p.paymentStatus === pay))
      .sort((a, b) => a.name.localeCompare(b.name, "pt"));
  }, [participants, q, dist, gender, pay]);

  const distName = (id: string) => distances.find((d) => d.id === id)?.name ?? id;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <label className="flex h-12 items-center gap-3 rounded-xl border border-ink-200 px-3.5 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 sm:col-span-2 lg:col-span-1">
          <Search className="size-5 text-ink-400" />
          <span className="sr-only">Procurar</span>
          <input value={q} onChange={(e) => { setQ(e.target.value); setLimit(PAGE); }} placeholder="Procurar nome, dorsal ou clube" className="h-full w-full bg-transparent focus:outline-none" />
        </label>
        <Select aria-label="Distância" value={dist} onChange={(e) => setDist(e.target.value)}>
          <option value="">Todas as distâncias</option>
          {distances.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select aria-label="Sexo" value={gender} onChange={(e) => setGender(e.target.value)}>
          <option value="">Ambos os sexos</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </Select>
        <Select aria-label="Pagamento" value={pay} onChange={(e) => setPay(e.target.value)}>
          <option value="">Todos os pagamentos</option>
          <option value="confirmado">Pago</option>
          <option value="pendente">Por pagar</option>
          <option value="cancelado">Cancelado</option>
        </Select>
      </div>

      <p className="text-[15px] text-ink-600"><strong className="text-ink-900">{rows.length}</strong> {rows.length === 1 ? "inscrito" : "inscritos"}</p>

      {rows.length === 0 ? (
        <EmptyState icon={<Users />} title="Ninguém encontrado" description="Confirme se o nome está bem escrito ou procure pelo número do dorsal." />
      ) : (
        <>
          {/* Tabela (ecrãs grandes) */}
          <div className="hidden overflow-hidden rounded-2xl border border-ink-200/70 bg-white shadow-card md:block">
            <table className="w-full text-left text-[15px]">
              <thead className="bg-ink-50 text-sm text-ink-600">
                <tr>
                  {["Dorsal", "Nome", "Sexo", "Escalão", "Distância", "Clube", "Província", "Pagamento"].map((h) => <th key={h} className="px-4 py-3 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-100">
                {rows.slice(0, limit).map((p) => {
                  const ps = PAYMENT_STATUS[p.paymentStatus];
                  return (
                    <tr key={p.id} className="hover:bg-ink-50/60">
                      <td className="px-4 py-3"><span className="tabular inline-block min-w-12 rounded-md bg-ink-900 px-2 py-0.5 text-center text-sm font-bold text-white">{p.bib}</span></td>
                      <td className="px-4 py-3 font-semibold">{p.name}{p.nationality !== "Angola" && <span className="ml-1.5 text-xs font-normal text-ink-500">({p.nationality})</span>}</td>
                      <td className="px-4 py-3 text-ink-600">{p.gender}</td>
                      <td className="px-4 py-3 text-ink-600">{p.ageGroup}</td>
                      <td className="px-4 py-3 text-ink-600">{distName(p.distanceId)}</td>
                      <td className="px-4 py-3 text-ink-600">{p.club}</td>
                      <td className="px-4 py-3 text-ink-600">{p.province}</td>
                      <td className="px-4 py-3"><Badge tone={ps.tone}>{ps.label}</Badge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Cartões (telemóvel) */}
          <ul className="space-y-2 md:hidden">
            {rows.slice(0, limit).map((p) => {
              const ps = PAYMENT_STATUS[p.paymentStatus];
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-3.5 shadow-card">
                  <span className="tabular w-14 shrink-0 rounded-lg bg-ink-900 py-1.5 text-center text-sm font-bold text-white">{p.bib}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.name}</p>
                    <p className="truncate text-sm text-ink-500">{distName(p.distanceId)} · {GENDER_LABEL[p.gender]} · {p.ageGroup}</p>
                    <p className="truncate text-sm text-ink-500">{p.club} · {p.province}</p>
                  </div>
                  <Badge tone={ps.tone} className={cn("self-start")}>{ps.label}</Badge>
                </li>
              );
            })}
          </ul>

          {limit < rows.length && (
            <div className="text-center">
              <Button variant="outline" size="lg" onClick={() => setLimit((l) => l + PAGE)}>Mostrar mais ({rows.length - limit} restantes)</Button>
            </div>
          )}
        </>
      )}
      <p className="text-sm text-ink-500">Lista actualizada em {formatDateShort("2026-10-14")}. Os dados pessoais (BI, telemóvel, e-mail) nunca são mostrados publicamente.</p>
    </div>
  );
}
