"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Banner, Category, Sponsor } from "@/lib/types";
import { useToast } from "@/components/ui/toast";
import { adminMutate, type AdminOp, type AdminOpResult } from "@/server/actions/admin";
import type { AdminData, AdminEvent, CollectionName, Collections, SiteSettings } from "./admin-types";

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
  toggleActive: (name: "banners" | "sponsors", id: string) => void;
  moveBanner: (id: string, dir: -1 | 1) => void;
  setResultsPublished: (eventSlug: string, published: boolean) => void;
  saveSettings: (s: SiteSettings) => void;
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
        : name === "banners" ? { type: "banner.remove", id }
        : name === "sponsors" ? { type: "sponsor.remove", id }
        : null;
      void send(op);
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

  const value = useMemo<AdminStore>(
    () => ({ data, hydrated: true, create, update, remove, toggleActive, moveBanner, setResultsPublished, saveSettings }),
    [data, create, update, remove, toggleActive, moveBanner, setResultsPublished, saveSettings],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * Para as páginas com listas paginadas no servidor (inscrições, resultados, utilizadores — 12.10):
 * envia a operação, mostra o resultado e relê a página. `pending` fica true enquanto o servidor responde.
 */
export function useAdminRun() {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const run = useCallback(
    (op: AdminOp, success?: string, after?: (res: AdminOpResult) => void) =>
      startTransition(async () => {
        const res = await adminMutate(op).catch(() => ({ ok: false as const, error: "Verifique a ligação à internet e tente de novo." }));
        if (!res.ok) toast({ title: "Não foi guardado", description: res.error, tone: "error" });
        else if (res.message) toast({ title: success ?? "Guardado", description: res.message, tone: "info" });
        else if (success) toast({ title: success });
        after?.(res);
        router.refresh();
      }),
    [router, toast],
  );
  return { run, pending };
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
          const raw = c == null ? "" : String(c);
          // Evita fórmulas no Excel (12.4, B3)
          const s = typeof c !== "number" && raw !== "-" && /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
          return /[",;\n']/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(","),
    )
    .join("\n");
}
