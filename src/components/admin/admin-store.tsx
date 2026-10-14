"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Banner, Category, Participant, RaceResult, Registration, SportsEvent, Sponsor, User } from "@/lib/types";
import { BANNERS, CATEGORIES, EVENTS, PARTICIPANTS, REGISTRATIONS, RESULTS, SPONSORS, USERS } from "@/lib/data";

/**
 * Loja de dados do painel de gestão (mock). Parte dos dados de demonstração,
 * aplica as alterações em memória e guarda-as no localStorage.
 * Quando houver backend, cada acção passa a chamar a API correspondente.
 */

const STORAGE_KEY = "aerotiming:admin";
const VERSION = 1;

/** Evento com campos extra que só existem no painel (rascunho, ficheiros simulados). */
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
  multicaixaEntity: "11223",
  bankName: "Banco Palanca",
  iban: "AO06 0040 0000 1234 5678 1019 1",
  accountHolder: "AeroTiming, Lda.",
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

type Collections = {
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

function seed(): AdminData {
  const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
  return {
    events: clone(EVENTS),
    participants: clone(PARTICIPANTS),
    results: clone(RESULTS),
    users: clone(USERS),
    registrations: clone(REGISTRATIONS),
    banners: clone(BANNERS),
    sponsors: clone(SPONSORS),
    categories: clone(CATEGORIES),
    settings: { ...DEFAULT_SETTINGS },
    publishedResults: Array.from(new Set(RESULTS.map((r) => r.eventSlug))),
  };
}

const keyOf = (name: CollectionName, item: object) =>
  name === "categories" ? (item as Category).slug : (item as { id: string }).id;

interface AdminStore {
  data: AdminData;
  hydrated: boolean;
  create: <K extends CollectionName>(name: K, item: Collections[K]) => void;
  update: <K extends CollectionName>(name: K, id: string, patch: Partial<Collections[K]>) => void;
  remove: <K extends CollectionName>(name: K, id: string) => void;
  /** Substitui todos os itens de uma colecção que satisfazem `match` (ex.: resultados de uma distância). */
  replaceWhere: <K extends CollectionName>(name: K, match: (item: Collections[K]) => boolean, items: Collections[K][]) => void;
  confirmPayment: (participantId: string | string[]) => void;
  toggleActive: (name: "users" | "banners" | "sponsors", id: string) => void;
  moveBanner: (id: string, dir: -1 | 1) => void;
  setResultsPublished: (eventSlug: string, published: boolean) => void;
  saveSettings: (s: SiteSettings) => void;
  reset: () => void;
}

const Ctx = createContext<AdminStore | null>(null);

export function useAdmin() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAdmin deve ser usado dentro de <AdminStoreProvider>");
  return ctx;
}

export function AdminStoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AdminData>(seed);
  const [hydrated, setHydrated] = useState(false);
  const skipSave = useRef(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { v: number; data: AdminData };
        if (parsed.v === VERSION && parsed.data?.events) setData({ ...seed(), ...parsed.data });
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: VERSION, data }));
    } catch {}
  }, [data, hydrated]);

  const create = useCallback<AdminStore["create"]>((name, item) => {
    setData((d) => ({ ...d, [name]: [item, ...(d[name] as object[])] }));
  }, []);

  const update = useCallback<AdminStore["update"]>((name, id, patch) => {
    setData((d) => ({ ...d, [name]: (d[name] as object[]).map((x) => (keyOf(name, x) === id ? { ...x, ...patch } : x)) }));
  }, []);

  const remove = useCallback<AdminStore["remove"]>((name, id) => {
    setData((d) => ({ ...d, [name]: (d[name] as object[]).filter((x) => keyOf(name, x) !== id) }));
  }, []);

  const replaceWhere = useCallback<AdminStore["replaceWhere"]>((name, match, items) => {
    setData((d) => {
      const list = d[name] as unknown as Collections[typeof name][];
      return { ...d, [name]: [...list.filter((x) => !match(x)), ...items] };
    });
  }, []);

  const confirmPayment = useCallback<AdminStore["confirmPayment"]>((ids) => {
    const set = new Set(Array.isArray(ids) ? ids : [ids]);
    setData((d) => ({ ...d, participants: d.participants.map((p) => (set.has(p.id) ? { ...p, paymentStatus: "confirmado" } : p)) }));
  }, []);

  const toggleActive = useCallback<AdminStore["toggleActive"]>((name, id) => {
    setData((d) => ({ ...d, [name]: (d[name] as { id: string; active: boolean }[]).map((x) => (x.id === id ? { ...x, active: !x.active } : x)) }));
  }, []);

  const moveBanner = useCallback((id: string, dir: -1 | 1) => {
    setData((d) => {
      const sorted = [...d.banners].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return d;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      return { ...d, banners: sorted.map((b, k) => ({ ...b, order: k + 1 })) };
    });
  }, []);

  const setResultsPublished = useCallback((slug: string, published: boolean) => {
    setData((d) => ({
      ...d,
      publishedResults: published ? Array.from(new Set([...d.publishedResults, slug])) : d.publishedResults.filter((s) => s !== slug),
    }));
  }, []);

  const saveSettings = useCallback((settings: SiteSettings) => setData((d) => ({ ...d, settings })), []);

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    skipSave.current = true;
    setData(seed());
  }, []);

  const value = useMemo<AdminStore>(
    () => ({ data, hydrated, create, update, remove, replaceWhere, confirmPayment, toggleActive, moveBanner, setResultsPublished, saveSettings, reset }),
    [data, hydrated, create, update, remove, replaceWhere, confirmPayment, toggleActive, moveBanner, setResultsPublished, saveSettings, reset],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/* ------------------------------------------------------------------ */
/* Utilitários partilhados pelas páginas do painel                     */
/* ------------------------------------------------------------------ */

export const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function slugify(s: string) {
  return normalize(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Preço pago por um participante (fase em vigor na data da inscrição). */
export function participantPrice(events: SportsEvent[], p: Participant) {
  const ev = events.find((e) => e.slug === p.eventSlug);
  const dist = ev?.distances.find((d) => d.id === p.distanceId);
  if (!dist || dist.tiers.length === 0) return 0;
  const day = p.registeredAt.slice(0, 10);
  return (dist.tiers.find((t) => t.until >= day) ?? dist.tiers[dist.tiers.length - 1]).price;
}

export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob(["﻿" + content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((r) =>
      r
        .map((c) => {
          const s = c == null ? "" : String(c);
          return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
