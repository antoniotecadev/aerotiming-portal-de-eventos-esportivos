// Tipos do painel partilhados entre o servidor (src/server/queries/admin.ts) e o cliente (admin-store.tsx).
import type { Banner, Category, Participant, RaceResult, Registration, SportsEvent, Sponsor, User } from "@/lib/types";

/** Evento com campos extra do painel (rascunho e ficheiros). */
export type AdminEvent = SportsEvent & {
  draft?: boolean;
  regulationPdf?: { name: string; url: string } | null;
  routeFiles?: Record<string, { gpx?: string; image?: string }>;
};

export type AdminParticipant = Participant & { kitPickedUp?: boolean };

export interface SiteSettings {
  siteName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  multicaixaEntity: string;
  bankName: string;
  iban: string;
  accountHolder: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "AeroTiming",
  tagline: "Eventos desportivos em Angola",
  email: "geral@aerotiming.ao",
  phone: "+244 923 000 000",
  whatsapp: "+244 923 000 000",
  address: "Talatona, Luanda",
  facebook: "https://facebook.com/aerotiming",
  instagram: "https://instagram.com/aerotiming",
  youtube: "",
  tiktok: "",
  multicaixaEntity: "",
  bankName: "",
  iban: "",
  accountHolder: "",
};

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
