"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Banner, Category, Participant, RaceResult, SportsEvent, Sponsor, User } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { adminMutate, type AdminOp } from "@/server/actions/admin";
import type { AdminData, AdminEvent, AdminParticipant, CollectionName, Collections, SiteSettings } from "./admin-types";

export type { AdminData, AdminEvent, AdminParticipant, CollectionName, SiteSettings } from "./admin-types";
export { DEFAULT_SETTINGS } from "./admin-types";

/**
 * Loja de dados do painel — DADOS REAIS (Fase 9). Os dados chegam do servidor (src/server/queries/admin.ts,
 * já filtrados por permissão). Cada acção actualiza o ecrã de imediato e grava no servidor
 * (src/server/actions/admin.ts); a seguir os dados são relidos. Se o servidor recusar, mostra o erro e repõe.
 */

const keyOf = (name: CollectionName, item: object) =>
  name === "categories" ? (item as { slug: string }).slug : (item as { id: string }).id;

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

/** Converte uma alteração do ecrã na operação do servidor. */
function opFor<K extends CollectionName>(name: K, item: Collections[K], isNew: boolean): AdminOp | null {
  switch (name) {
    case "events":
      return { type: "event.save", event: item as AdminEvent, isNew };
    case "results":
      return { type: "results.sync", upsert: [item as RaceResult], removeIds: [] };
    case "users":
      return { type: "user.save", user: item as User, isNew };
    case "banners":
      return { type: "banner.save", banner: item as Banner };
    case "sponsors":
      return { type: "sponsor.save", sponsor: item as Sponsor };
    default:
      return null;
  }
}

export function AdminStoreProvider({ initial, children }: { initial: AdminData; children: React.ReactNode }) {
  const router = useRouter();
  const toast = useToast();
  const [data, setData] = useState<AdminData>(initial);
  const latest = useRef(data);
  latest.current = data;

  // Quando o servidor devolve dados novos (router.refresh), sincroniza
  useEffect(() => setData(initial), [initial]);

  const send = useCallback(
    async (op: AdminOp | null) => {
      if (!op) return;
      const res = await adminMutate(op);
      if (!res.ok) toast({ title: "Não foi guardado", description: res.error, tone: "error" });
      else if (res.message) toast({ title: "Atenção", description: res.message, tone: "info" });
      router.refresh();
    },
    [router, toast],
  );

  const find = <K extends CollectionName>(name: K, id: string) =>
    (latest.current[name] as unknown as Collections[K][]).find((x) => keyOf(name, x as object) === id);

  const create = useCallback<AdminStore["create"]>(
    (name, item) => {
      setData((d) => ({ ...d, [name]: [item, ...(d[name] as object[])] }));
      void send(opFor(name, item, true));
    },
    [send],
  );

  const update = useCallback<AdminStore["update"]>(
    (name, id, patch) => {
      const current = find(name, id);
      setData((d) => ({ ...d, [name]: (d[name] as object[]).map((x) => (keyOf(name, x) === id ? { ...x, ...patch } : x)) }));
      if (!current) return;
      if (name === "participants") return void send({ type: "participant.update", id, patch: patch as Partial<AdminParticipant> });
      if (name === "categories") return void send({ type: "category.update", slug: id, patch: patch as Partial<Category> });
      void send(opFor(name, { ...current, ...patch } as Collections[typeof name], false));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [send],
  );

  const remove = useCallback<AdminStore["remove"]>(
    (name, id) => {
      setData((d) => ({ ...d, [name]: (d[name] as object[]).filter((x) => keyOf(name, x) !== id) }));
      const op: AdminOp | null =
        name === "events" ? { type: "event.remove", id }
        : name === "results" ? { type: "results.sync", upsert: [], removeIds: [id] }
        : name === "users" ? { type: "user.remove", id }
        : name === "banners" ? { type: "banner.remove", id }
        : name === "sponsors" ? { type: "sponsor.remove", id }
        : null;
      void send(op);
    },
    [send],
  );

  const replaceWhere = useCallback<AdminStore["replaceWhere"]>(
    (name, match, items) => {
      const list = latest.current[name] as unknown as Collections[typeof name][];
      const keep = new Set(items.map((x) => keyOf(name, x as object)));
      const removeIds = list.filter(match).map((x) => keyOf(name, x as object)).filter((id) => !keep.has(id));
      setData((d) => ({ ...d, [name]: [...(d[name] as unknown as Collections[typeof name][]).filter((x) => !match(x)), ...items] }));
      if (name === "results") void send({ type: "results.sync", upsert: items as RaceResult[], removeIds });
    },
    [send],
  );

  const confirmPayment = useCallback<AdminStore["confirmPayment"]>(
    (ids) => {
      const list = Array.isArray(ids) ? ids : [ids];
      const set = new Set(list);
      setData((d) => ({ ...d, participants: d.participants.map((p) => (set.has(p.id) ? { ...p, paymentStatus: "confirmado" } : p)) }));
      void send({ type: "payment.confirm", participantIds: list });
    },
    [send],
  );

  const toggleActive = useCallback<AdminStore["toggleActive"]>(
    (name, id) => {
      const current = find(name, id) as { active: boolean } | undefined;
      if (current) update(name, id, { active: !current.active } as never);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [update],
  );

  const moveBanner = useCallback(
    (id: string, dir: -1 | 1) => {
      const sorted = [...latest.current.banners].sort((a, b) => a.order - b.order);
      const i = sorted.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= sorted.length) return;
      [sorted[i], sorted[j]] = [sorted[j], sorted[i]];
      setData((d) => ({ ...d, banners: sorted.map((b, k) => ({ ...b, order: k + 1 })) }));
      void send({ type: "banner.order", ids: sorted.map((b) => b.id) });
    },
    [send],
  );

  const setResultsPublished = useCallback(
    (slug: string, published: boolean) => {
      setData((d) => ({
        ...d,
        publishedResults: published ? Array.from(new Set([...d.publishedResults, slug])) : d.publishedResults.filter((x) => x !== slug),
      }));
      void send({ type: "results.publish", eventSlug: slug, published });
    },
    [send],
  );

  const saveSettings = useCallback(
    (settings: SiteSettings) => {
      setData((d) => ({ ...d, settings }));
      void send({ type: "settings.save", settings });
    },
    [send],
  );

  const reset = useCallback(() => {
    toast({ title: "Indisponível", description: "O painel usa dados reais. Para repor os dados de demonstração use \"npm run db:seed\" numa base de dados de desenvolvimento.", tone: "info" });
  }, [toast]);

  const value = useMemo<AdminStore>(
    () => ({ data, hydrated: true, create, update, remove, replaceWhere, confirmPayment, toggleActive, moveBanner, setResultsPublished, saveSettings, reset }),
    [data, create, update, remove, replaceWhere, confirmPayment, toggleActive, moveBanner, setResultsPublished, saveSettings, reset],
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
