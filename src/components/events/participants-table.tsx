"use client";

import { RotateCcw, Users } from "lucide-react";
import type { ParticipantsView } from "@/server/queries/registrations";
import { GENDER_LABEL, PAYMENT_STATUS } from "@/lib/format";
import { useUrlFilters } from "@/lib/use-url-filters";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/field";
import { EmptyState } from "@/components/ui/empty-state";
import { Pager, SearchBox } from "@/components/ui/pager";

/** Lista pública de inscritos — filtros e páginas no servidor (5.10), guardados no URL. */
export function ParticipantsTable({ view, distances }: { view: ParticipantsView; distances: { id: string; name: string }[] }) {
  const { params, set, hrefFor, pending } = useUrlFilters();
  const q = params.get("q") ?? "";
  const dist = params.get("distancia") ?? "";
  const gender = params.get("sexo") ?? "";
  const pay = params.get("pagamento") ?? "";
  const hasFilters = Boolean(q || dist || gender || pay);
  const distName = (id: string) => distances.find((d) => d.id === id)?.name ?? id;
  const rows = view.rows;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border border-ink-200/70 bg-white p-4 shadow-card sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <SearchBox value={q} onSearch={(v) => set({ q: v })} placeholder="Procurar nome, dorsal ou clube" label="Procurar inscrito" className="sm:col-span-2 lg:col-span-1" />
        <Select aria-label="Distância" value={dist} onChange={(e) => set({ distancia: e.target.value })}>
          <option value="">Todas as distâncias</option>
          {distances.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <Select aria-label="Sexo" value={gender} onChange={(e) => set({ sexo: e.target.value })}>
          <option value="">Ambos os sexos</option>
          <option value="M">Masculino</option>
          <option value="F">Feminino</option>
        </Select>
        <Select aria-label="Pagamento" value={pay} onChange={(e) => set({ pagamento: e.target.value })}>
          <option value="">Todos os pagamentos</option>
          <option value="confirmado">Pago</option>
          <option value="pendente">Por pagar</option>
        </Select>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-[15px] text-ink-600">
          <strong className="text-ink-900">{view.matching}</strong> {view.matching === 1 ? "inscrito" : "inscritos"}
          {hasFilters && ` (de ${view.total})`}
        </p>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => set({ q: null, distancia: null, sexo: null, pagamento: null })}>
            <RotateCcw /> Limpar filtros
          </Button>
        )}
      </div>

      <div className={cn("space-y-5 transition-opacity", pending && "opacity-60")} aria-busy={pending}>
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
                  {rows.map((p) => {
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
              {rows.map((p) => {
                const ps = PAYMENT_STATUS[p.paymentStatus];
                return (
                  <li key={p.id} className="flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-3.5 shadow-card">
                    <span className="tabular w-14 shrink-0 rounded-lg bg-ink-900 py-1.5 text-center text-sm font-bold text-white">{p.bib}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{p.name}</p>
                      <p className="truncate text-sm text-ink-500">{distName(p.distanceId)} · {GENDER_LABEL[p.gender]} · {p.ageGroup}</p>
                      <p className="truncate text-sm text-ink-500">{p.club} · {p.province}</p>
                    </div>
                    <Badge tone={ps.tone} className="self-start">{ps.label}</Badge>
                  </li>
                );
              })}
            </ul>

            <Pager page={view.page} pages={view.pages} hrefFor={hrefFor} />
          </>
        )}
      </div>
      <p className="text-sm text-ink-500">Os dados pessoais (BI, telemóvel, e-mail) nunca são mostrados publicamente.</p>
    </div>
  );
}
