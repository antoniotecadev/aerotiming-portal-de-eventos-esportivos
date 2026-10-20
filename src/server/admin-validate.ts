import "server-only";
import { DEFAULT_SETTINGS, type SiteSettings } from "@/lib/site";
import type { Banner, Category, Sponsor, User } from "@/lib/types";
import type { AdminEvent } from "@/components/admin/admin-types";

/**
 * Validação no servidor do que o painel envia (12.4, M5): os tipos TypeScript não protegem nada em
 * tempo de execução. Cada função devolve a 1.ª mensagem de erro, ou null se estiver tudo bem.
 * (Fica fora de admin.ts porque, num ficheiro "use server", tudo o que é exportado é público.)
 */

type Check = string | null;
const first = (...checks: Check[]) => checks.find((c) => c) ?? null;

/** Endereço seguro: https:// (ou http:// em desenvolvimento) e, se `relative`, caminhos do próprio site ("/…"). Nunca javascript:, data:… */
export function url(value: string | null | undefined, label: string, opts: { relative?: boolean; required?: boolean } = {}): Check {
  const v = (value ?? "").trim();
  if (!v || v === "#") return opts.required ? `${label}: em falta.` : null; // "#" = sem endereço (dados antigos)
  if (v.length > 2000) return `${label}: endereço demasiado longo.`;
  if (opts.relative && v.startsWith("/") && !/^\/[/\\]/.test(v)) return null;
  try {
    const u = new URL(v);
    if (u.protocol === "https:" || (u.protocol === "http:" && process.env.NODE_ENV !== "production")) return null;
  } catch {}
  return `${label}: use um endereço que comece por https://.`;
}

const text = (value: unknown, label: string, max: number, min = 0): Check => {
  const v = typeof value === "string" ? value.trim() : "";
  if (v.length < min) return min > 1 ? `${label}: escreva pelo menos ${min} caracteres.` : `${label}: em falta.`;
  return v.length > max ? `${label}: máximo de ${max} caracteres.` : null;
};

export function checkEvent(ev: AdminEvent): Check {
  if (typeof ev?.id !== "string" || !/^[\w-]{3,64}$/.test(ev.id)) return "Identificador do evento inválido.";
  return first(
    /^[a-z0-9]+(-[a-z0-9]+)*$/.test(ev.slug ?? "") && ev.slug.length <= 120 ? null : "Endereço (slug): só letras minúsculas, números e hífenes.",
    text(ev.title, "Título", 150, 3),
    text(ev.summary, "Resumo", 600),
    text(ev.venue, "Local", 200),
    text(ev.address, "Morada", 300),
    url(ev.mapUrl, "Mapa"),
    url(ev.poster, "Cartaz", { relative: true, required: true }),
    url(ev.cover, "Imagem de capa", { relative: true }),
    url(ev.regulationPdf?.url, "Regulamento (PDF)", { relative: true }),
    ...Object.values(ev.routeFiles ?? {}).flatMap((f) => [url(f.gpx, "Ficheiro GPX", { relative: true }), url(f.image, "Imagem do percurso", { relative: true })]),
    Array.isArray(ev.distances) && ev.distances.length <= 30 ? null : "Demasiadas distâncias.",
    ...(ev.distances ?? []).map((d) =>
      Number.isFinite(d.distanceKm) && d.distanceKm >= 0 && Number.isInteger(d.totalSlots) && d.tiers.every((t) => Number.isInteger(t.price) && t.price >= 0)
        ? text(d.name, "Nome da distância", 80, 1)
        : `${d.name || "Distância"}: valores inválidos (km, vagas ou preços).`,
    ),
  );
}

export function checkUser(u: User): Check {
  return first(
    ["atleta", "organizador", "admin"].includes(u?.role) ? null : "Papel inválido.",
    text(u.name, "Nome", 120, 3),
    text(u.email, "E-mail", 200, 3),
    text(u.club, "Clube", 120),
    text(u.province, "Província", 60),
  );
}

export const checkBanner = (b: Banner): Check =>
  first(text(b.title, "Título", 120, 1), text(b.subtitle, "Subtítulo", 300), text(b.ctaLabel, "Texto do botão", 40), url(b.image, "Imagem", { relative: true, required: true }), url(b.href, "Ligação", { relative: true }));

export const checkSponsor = (s: Sponsor): Check => first(text(s.name, "Nome", 120, 1), url(s.logo, "Logótipo", { relative: true, required: true }), url(s.url, "Site"));

export const checkCategory = (c: Partial<Category>): Check => first(text(c.name, "Nome", 60, 1), text(c.description, "Descrição", 300));

/** Só os campos conhecidos das Definições, como texto, com tamanho limitado e endereços seguros. */
export function cleanSettings(input: SiteSettings): { settings: SiteSettings } | { error: string } {
  const out = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]) {
    const v = input?.[key];
    if (v === undefined || v === null) continue;
    if (typeof v !== "string") return { error: `Definições: valor inválido em ${key}.` };
    if (v.length > 300) return { error: `Definições: ${key} tem mais de 300 caracteres.` };
    out[key] = v.trim();
  }
  const err = first(
    text(out.siteName, "Nome do site", 60, 2),
    ...(["facebook", "instagram", "youtube", "tiktok", "linkedin"] as const).map((k) => url(out[k], k)),
    out.email && !/^\S+@\S+\.\S+$/.test(out.email) ? "E-mail inválido." : null,
    out.privacyEmail && !/^\S+@\S+\.\S+$/.test(out.privacyEmail) ? "E-mail para dados pessoais inválido." : null,
  );
  return err ? { error: err } : { settings: out };
}
