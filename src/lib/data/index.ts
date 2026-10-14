import type { CategorySlug, EventStatus, SportsEvent } from "../types";
import { EVENTS } from "./events";
import { BANNERS, CATEGORIES, PROVINCES, SPONSORS } from "./catalog";
import { PARTICIPANTS, REGISTRATIONS, RESULTS, USERS } from "./people";

export { EVENTS, BANNERS, CATEGORIES, PROVINCES, SPONSORS, PARTICIPANTS, REGISTRATIONS, RESULTS, USERS };

/** "Hoje" fixo para os dados mock fazerem sentido (troque por new Date() com backend real). */
export const TODAY = "2026-10-14";

export const OPEN_STATUSES: EventStatus[] = ["inscricoes-abertas", "ultimas-vagas"];

export const getEvent = (slug: string) => EVENTS.find((e) => e.slug === slug);
export const getCategory = (slug: CategorySlug) => CATEGORIES.find((c) => c.slug === slug)!;
export const getSponsor = (id: string) => SPONSORS.find((s) => s.id === id);

export const upcomingEvents = () =>
  EVENTS.filter((e) => e.date >= TODAY && e.status !== "cancelado").sort((a, b) => a.date.localeCompare(b.date));

export const pastEvents = () => EVENTS.filter((e) => e.status === "terminado").sort((a, b) => b.date.localeCompare(a.date));

export const recentEvents = (limit = 4) =>
  [...upcomingEvents()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

export const isOpen = (e: SportsEvent) => OPEN_STATUSES.includes(e.status);

export const participantsOf = (slug: string) => PARTICIPANTS.filter((p) => p.eventSlug === slug);
export const resultsOf = (slug: string) => RESULTS.filter((r) => r.eventSlug === slug);
export const hasResults = (slug: string) => RESULTS.some((r) => r.eventSlug === slug);

/** Preço em vigor para uma distância (primeira fase cujo prazo ainda não passou). */
export function currentTier(distance: SportsEvent["distances"][number], today = TODAY) {
  return distance.tiers.find((t) => t.until >= today) ?? distance.tiers[distance.tiers.length - 1];
}

export function minPrice(e: SportsEvent) {
  return Math.min(...e.distances.map((d) => currentTier(d).price));
}

export function slotsLeft(e: SportsEvent) {
  return e.distances.reduce((acc, d) => acc + (d.totalSlots - d.slotsTaken), 0);
}

export interface EventFilters {
  q?: string;
  categoria?: string;
  provincia?: string;
  mes?: string; // YYYY-MM
  estado?: "abertas" | "todas" | "terminadas";
}

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function filterEvents(list: SportsEvent[], f: EventFilters) {
  const q = f.q ? norm(f.q.trim()) : "";
  return list.filter((e) => {
    if (q && !norm(`${e.title} ${e.city} ${e.province} ${e.venue} ${e.distances.map((d) => d.name).join(" ")}`).includes(q)) return false;
    if (f.categoria && e.category !== f.categoria) return false;
    if (f.provincia && e.province !== f.provincia) return false;
    if (f.mes && !e.date.startsWith(f.mes)) return false;
    if (f.estado === "abertas" && !isOpen(e)) return false;
    if (f.estado === "terminadas" && e.status !== "terminado") return false;
    return true;
  });
}
