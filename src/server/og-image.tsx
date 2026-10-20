import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { formatDate, formatKm } from "@/lib/format";
import type { SportsEvent } from "@/lib/types";
import { SITE_URL } from "./seo";

/**
 * Imagens de partilha (Open Graph) 1200×630 — 12.8. Cores da marca (globals.css) e a fonte dos títulos do
 * site (Barlow Condensed, licença OFL em og-assets/OFL.txt). Os ficheiros ficam em src/server/og-assets/ com
 * caminhos fixos para o Next os incluir no deploy (os de public/ podem não existir na função do servidor).
 */
export const OG_SIZE = { width: 1200, height: 630 };
const INK = "#0e1a33";
const BRAND = "#e23d0b";
const SUN = "#ffc21a";

const asset = (file: string) => readFile(path.join(process.cwd(), "src/server/og-assets", file));
const fontsPromise = Promise.all([
  asset("BarlowCondensed-ExtraBold.ttf"),
  asset("BarlowCondensed-ExtraBoldItalic.ttf"),
  asset("BarlowCondensed-SemiBold.ttf"),
]).then(([bold, boldItalic, semi]) => [
  { name: "Barlow", data: bold, weight: 800 as const, style: "normal" as const },
  { name: "Barlow", data: boldItalic, weight: 800 as const, style: "italic" as const },
  { name: "Barlow", data: semi, weight: 600 as const, style: "normal" as const },
]);
const iconPromise = asset("icon-192.png").then((b) => `data:image/png;base64,${b.toString("base64")}`);

const dataUrl = (bytes: Buffer, type: string) => (type === "image/png" || type === "image/jpeg" ? `data:${type};base64,${bytes.toString("base64")}` : null);

/** Cartaz → data URL. Local (/images/…): do disco ou, se não estiver lá, do próprio site. Só JPEG/PNG (o gerador não lê WebP/AVIF). */
async function posterData(src: string | null | undefined): Promise<string | null> {
  if (!src) return null;
  try {
    if (src.startsWith("/")) {
      const type = /\.png$/i.test(src) ? "image/png" : /\.jpe?g$/i.test(src) ? "image/jpeg" : "";
      if (!type) return null;
      const local = await readFile(path.join(process.cwd(), "public", decodeURIComponent(src.split("?")[0]))).catch(() => null);
      if (local) return dataUrl(local, type);
      src = `${SITE_URL}${src}`;
    }
    const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    return dataUrl(Buffer.from(await res.arrayBuffer()), res.headers.get("content-type")?.split(";")[0] ?? "");
  } catch {
    return null;
  }
}

function Brand({ icon, size }: { icon: string; size: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      <img src={icon} width={size} height={size} alt="" />
      <div style={{ display: "flex", fontSize: size * 0.95, fontWeight: 800, fontStyle: "italic", letterSpacing: -0.5 }}>
        <span style={{ color: "white" }}>Conexão</span>
        <span style={{ color: BRAND }}>Sport</span>
      </div>
    </div>
  );
}

const Stripe = () => (
  <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, height: 10 }}>
    <div style={{ flex: 1, background: BRAND }} />
    <div style={{ flex: 1, background: "#1d2b4a" }} />
    <div style={{ flex: 1, background: SUN }} />
  </div>
);

/** Imagem geral do site (páginas sem imagem própria). */
export async function siteOgImage() {
  const [fonts, icon] = await Promise.all([fontsPromise, iconPromise]);
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: INK, padding: "0 90px", position: "relative", color: "white", fontFamily: "Barlow" }}>
        <Stripe />
        <Brand icon={icon} size={96} />
        <div style={{ display: "flex", marginTop: 44, fontSize: 76, fontWeight: 800, lineHeight: 1, textTransform: "uppercase" }}>Encontre a sua próxima prova</div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 36, fontWeight: 600, color: "#b8c2d6" }}>
          Inscrições, pagamentos e resultados de provas desportivas em Angola
        </div>
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}

/** Imagem de um evento: cartaz à direita, título, data e local à esquerda. `label` ex.: "Resultados oficiais". */
export async function eventOgImage(event: SportsEvent | null, label?: string) {
  if (!event) return siteOgImage();
  const [fonts, icon, poster] = await Promise.all([fontsPromise, iconPromise, posterData(event.poster)]);
  const distances = [...new Set(event.distances.map((d) => formatKm(d.distanceKm)))].slice(0, 5).join(" · ");
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: INK, position: "relative", color: "white", fontFamily: "Barlow" }}>
        <Stripe />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", flex: 1, padding: "56px 48px 48px 64px" }}>
          <Brand icon={icon} size={48} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 800, color: SUN, textTransform: "uppercase", letterSpacing: 2 }}>
              {label ?? event.categoryName ?? "Evento"}
            </div>
            <div style={{ display: "flex", marginTop: 8, fontSize: event.title.length > 34 ? 66 : 80, fontWeight: 800, lineHeight: 0.98, textTransform: "uppercase" }}>
              {event.title}
            </div>
            <div style={{ display: "flex", marginTop: 24, fontSize: 38, fontWeight: 600, color: "#d6dceb" }}>
              {formatDate(event.date)} · {event.city}
            </div>
            {distances && <div style={{ display: "flex", marginTop: 6, fontSize: 34, fontWeight: 600, color: "#9aa6bf" }}>{distances}</div>}
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#9aa6bf" }}>Inscrições e resultados online</div>
        </div>
        {poster && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 430, padding: "40px 48px 40px 0" }}>
            {/* Cartazes 1080×1300 */}
            <img src={poster} alt="" width={382} height={460} style={{ objectFit: "cover", borderRadius: 18, border: `6px solid ${BRAND}` }} />
          </div>
        )}
      </div>
    ),
    { ...OG_SIZE, fonts },
  );
}
