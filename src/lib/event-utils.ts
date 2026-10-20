// Funções puras sobre eventos — usadas no servidor e no cliente (sem acesso a dados).
import type { EventDistance, EventStatus, SportsEvent } from "./types";

export const OPEN_STATUSES: EventStatus[] = ["inscricoes-abertas", "ultimas-vagas"];

export const isOpen = (e: SportsEvent) => OPEN_STATUSES.includes(e.status);

/** Preço em vigor para uma distância (primeira fase cujo prazo ainda não passou). */
export function currentTier(distance: EventDistance, today: string) {
  return distance.tiers.find((t) => t.until >= today) ?? distance.tiers[distance.tiers.length - 1];
}

export function minPrice(e: SportsEvent, today: string) {
  return e.priceFrom ?? Math.min(...e.distances.map((d) => currentTier(d, today).price));
}

export function slotsLeft(e: SportsEvent) {
  return e.distances.reduce((acc, d) => acc + Math.max(0, d.totalSlots - d.slotsTaken), 0);
}

export interface EventFilters {
  q?: string;
  categoria?: string;
  provincia?: string;
  mes?: string; // YYYY-MM
  estado?: "abertas" | "todas" | "terminadas";
}

export const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filterEvents(list: SportsEvent[], f: EventFilters) {
  const q = f.q ? normalize(f.q.trim()) : "";
  return list.filter((e) => {
    if (q && !normalize(`${e.title} ${e.city} ${e.province} ${e.venue} ${e.distances.map((d) => d.name).join(" ")}`).includes(q)) return false;
    if (f.categoria && e.category !== f.categoria) return false;
    if (f.provincia && e.province !== f.provincia) return false;
    if (f.mes && !e.date.startsWith(f.mes)) return false;
    if (f.estado === "abertas" && !isOpen(e)) return false;
    if (f.estado === "terminadas" && e.status !== "terminado") return false;
    return true;
  });
}
