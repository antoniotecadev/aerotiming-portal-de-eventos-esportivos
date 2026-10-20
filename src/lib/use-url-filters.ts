"use client";

import { useCallback, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

/**
 * Filtros e página das listas públicas guardados no URL (5.10): o servidor lê-os e devolve só a página pedida.
 * Mudar um filtro volta à página 1. `pending` fica true enquanto o servidor responde.
 */
export function useUrlFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const hrefFor = useCallback(
    (patch: Record<string, string | number | null>) => {
      const next = new URLSearchParams(params.toString());
      if (!("pagina" in patch)) next.delete("pagina");
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "" || (k === "pagina" && Number(v) <= 1)) next.delete(k);
        else next.set(k, String(v));
      }
      const qs = next.toString();
      return qs ? `${pathname}?${qs}` : pathname;
    },
    [params, pathname],
  );

  const set = useCallback(
    (patch: Record<string, string | number | null>) => startTransition(() => router.replace(hrefFor(patch), { scroll: false })),
    [router, hrefFor],
  );

  return { params, set, hrefFor, pending };
}
