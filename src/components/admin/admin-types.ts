// Tipos do painel partilhados entre o servidor (src/server/queries/admin.ts) e o cliente (admin-store.tsx).
import type { Banner, Category, Participant, RaceResult, Registration, SportsEvent, Sponsor, User } from "@/lib/types";
import type { SiteSettings } from "@/lib/site";

export { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site";

/** Evento com campos extra do painel (rascunho e ficheiros). */
export type AdminEvent = SportsEvent & {
  draft?: boolean;
  regulationPdf?: { name: string; url: string } | null;
  routeFiles?: Record<string, { gpx?: string; image?: string }>;
};

export type AdminParticipant = Participant & { kitPickedUp?: boolean };

export interface AdminData {
  events: AdminEvent[];
  participants: AdminParticipant[];
  results: RaceResult[];
  users: User[];
  registrations: Registration[];
  banners: Banner[];
  sponsors: Sponsor[];
  categories: Category[];
  settings: SiteSettings;
  /** Slugs de eventos com resultados publicados no site. */
  publishedResults: string[];
}

export type Collections = {
  events: AdminEvent;
  participants: AdminParticipant;
  results: RaceResult;
  users: User;
  registrations: Registration;
  banners: Banner;
  sponsors: Sponsor;
  categories: Category;
};
export type CollectionName = keyof Collections;
