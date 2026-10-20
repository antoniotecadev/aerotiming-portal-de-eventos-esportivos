import type { MetadataRoute } from "next";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/**
 * Regras para os motores de busca (12.8). Fora de produção (pré-visualizações do Vercel, dev) bloqueia tudo,
 * para não aparecerem cópias do site no Google.
 */
export default function robots(): MetadataRoute.Robots {
  const production = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : process.env.NODE_ENV === "production";
  if (!production) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/perfil", "/checkin", "/api/", "/auth/", "/entrar", "/criar-conta", "/recuperar-senha", "/nova-palavra-passe", "/eventos/*/inscricao"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
