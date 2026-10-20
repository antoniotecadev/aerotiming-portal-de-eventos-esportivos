"use client";

import Link from "next/link";
import { CalendarDays, ChevronRight, Gauge, Medal, Timer, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { RESULT_STATUS, formatDate, formatKm } from "@/lib/format";
import { type ResultWithEvent, toSeconds } from "./profile-data";

function Stat({ label, value, Icon }: { label: string; value: React.ReactNode; Icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-xl bg-ink-50 px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-0.5 text-lg font-bold text-ink-900 tabular">{value}</p>
    </div>
  );
}

export function MyResults({ results }: { results: ResultWithEvent[] }) {

  if (results.length === 0)
    return (
      <EmptyState
        icon={<Trophy />}
        title="Ainda não tem resultados"
        description="Depois de terminar uma prova cronometrada pela AeroTiming, o seu tempo e a sua posição aparecem aqui automaticamente."
        action={
          <div className="flex flex-wrap justify-center gap-2">
            <ButtonLink href="/eventos" size="lg">
              Ver eventos
            </ButtonLink>
            <ButtonLink href="/resultados" size="lg" variant="outline">
              Procurar resultados
            </ButtonLink>
          </div>
        }
      />
    );

  // Melhor marca por distância
  const bests = new Map<number, ResultWithEvent>();
  for (const r of results) {
    if (r.status !== "terminou" || !r.chipTime || !r.distance) continue;
    const km = r.distance.distanceKm;
    const prev = bests.get(km);
    if (!prev || toSeconds(r.chipTime) < toSeconds(prev.chipTime!)) bests.set(km, r);
  }
  const pbs = [...bests.entries()].sort((a, b) => a[0] - b[0]);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Os meus recordes pessoais</h2>
        <p className="text-ink-600">O seu melhor tempo em cada distância.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {pbs.map(([km, r]) => (
            <Card key={km} className="relative overflow-hidden p-5">
              <Medal className="absolute -top-2 -right-2 size-20 text-sun-400/20" aria-hidden />
              <p className="text-sm font-bold tracking-wide text-brand-600 uppercase">{formatKm(km)}</p>
              <p className="mt-1 font-display text-4xl font-extrabold text-ink-900 tabular">{r.chipTime}</p>
              <p className="mt-1 truncate text-sm text-ink-500">
                {r.event.title} · {r.pace} min/km
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-extrabold tracking-tight text-ink-900">Todas as provas</h2>
        <ul className="mt-4 grid gap-4">
          {results.map((r) => (
            <li key={r.id}>
              <Card className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg leading-snug font-bold text-ink-900">{r.event.title}</h3>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                      <span className="inline-flex items-center gap-1">
                        <CalendarDays className="size-3.5" /> {formatDate(r.event.date)}
                      </span>
                      <span>{r.distance?.name}</span>
                      <span>Dorsal {r.bib}</span>
                    </p>
                  </div>
                  {r.status === "terminou" ? (
                    <Badge tone="green" dot>
                      Terminou
                    </Badge>
                  ) : (
                    <Badge tone="gray">{RESULT_STATUS[r.status]}</Badge>
                  )}
                </div>
                {r.status === "terminou" && (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
                    <Stat label="Tempo (chip)" value={r.chipTime} Icon={Timer} />
                    <Stat label="Ritmo" value={`${r.pace} /km`} Icon={Gauge} />
                    <Stat label="Geral" value={`${r.position}º`} Icon={Trophy} />
                    <Stat label={r.gender === "F" ? "Feminino" : "Masculino"} value={`${r.positionGender}º`} Icon={Medal} />
                    <Stat label={r.ageGroup} value={`${r.positionAgeGroup}º`} Icon={Medal} />
                  </div>
                )}
                <Link href={`/resultados/${r.event.slug}?q=${r.bib}`} className="mt-4 inline-flex h-11 items-center gap-1 font-semibold text-brand-700 hover:underline">
                  Ver na classificação completa <ChevronRight className="size-4" />
                </Link>
              </Card>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
