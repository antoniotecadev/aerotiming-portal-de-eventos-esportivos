// DADOS DE DEMONSTRAÇÃO — usados só pelo seed (prisma/seed.ts).
// migradas para a BD (perfil/auth → Fase 6, admin → Fase 9). As páginas públicas usam
// src/server/queries. Ver GUIA_MIGRACAO.md (tarefa 5.12).
import type { CategorySlug, EventDistance, SportsEvent } from "../../src/lib/types";
import * as utils from "../../src/lib/event-utils";
import { EVENTS } from "./events";
import { BANNERS, CATEGORIES, SPONSORS } from "./catalog";
import { PROVINCES } from "../../src/lib/constants";
import { PARTICIPANTS, REGISTRATIONS, RESULTS, USERS } from "./people";

export { EVENTS, BANNERS, CATEGORIES, PROVINCES, SPONSORS, PARTICIPANTS, REGISTRATIONS, RESULTS, USERS };
export { OPEN_STATUSES, isOpen, slotsLeft, filterEvents, type EventFilters } from "../../src/lib/event-utils";

/** "Hoje" fixo para os dados mock fazerem sentido. */
export const TODAY = "2026-10-14";

export const getEvent = (slug: string) => EVENTS.find((e) => e.slug === slug);
export const getCategory = (slug: CategorySlug) => CATEGORIES.find((c) => c.slug === slug)!;
export const getSponsor = (id: string) => SPONSORS.find((s) => s.id === id);

export const upcomingEvents = () =>
  EVENTS.filter((e) => e.date >= TODAY && e.status !== "cancelado").sort((a, b) => a.date.localeCompare(b.date));
export const pastEvents = () => EVENTS.filter((e) => e.status === "terminado").sort((a, b) => b.date.localeCompare(a.date));
export const recentEvents = (limit = 4) => [...upcomingEvents()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

export const participantsOf = (slug: string) => PARTICIPANTS.filter((p) => p.eventSlug === slug);
export const resultsOf = (slug: string) => RESULTS.filter((r) => r.eventSlug === slug);
export const hasResults = (slug: string) => RESULTS.some((r) => r.eventSlug === slug);

export const currentTier = (distance: EventDistance, today = TODAY) => utils.currentTier(distance, today);
export const minPrice = (e: SportsEvent, today = TODAY) => utils.minPrice(e, today);
