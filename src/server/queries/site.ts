import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site";

/** Contactos e redes sociais do site (painel → Definições). Campos em falta ficam com os valores por omissão. */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  await connection();
  const row = await prisma.siteSetting.findUnique({ where: { key: "site" } });
  return { ...DEFAULT_SETTINGS, ...((row?.value as Partial<SiteSettings> | undefined) ?? {}) };
});
