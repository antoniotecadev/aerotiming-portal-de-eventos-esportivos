import "server-only";
import { PDFDocument, type PDFFont, type PDFPage, StandardFonts, rgb } from "pdf-lib";
import { prisma } from "@/lib/db";
import { formatDate, formatKm } from "@/lib/format";
import { msToHms } from "./mappers";
import { getSiteSettings } from "./queries/site";

/**
 * Certificado de finisher em PDF (10.5), gerado no servidor com pdf-lib (sem browser headless).
 * Só para resultados publicados de atletas que terminaram. Devolve null se não houver certificado.
 */

const BRAND = rgb(0xf9 / 255, 0x57 / 255, 0x16 / 255);
const INK = rgb(0x0e / 255, 0x1a / 255, 0x33 / 255);
const SUN = rgb(0xff / 255, 0xc2 / 255, 0x1a / 255);
const GREY = rgb(0.4, 0.44, 0.52);
const LIGHT = rgb(0.86, 0.88, 0.92);

// As fontes-padrão do PDF só têm o alfabeto latino (WinAnsi): o resto é trocado pela letra base ou retirado.
const WIN_ANSI_EXTRA = new Set("€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ");
const NO_DECOMPOSITION: Record<string, string> = { Ł: "L", ł: "l", Đ: "D", đ: "d", Ħ: "H", ħ: "h", ı: "i", Ŀ: "L", ŀ: "l", Ŧ: "T", ŧ: "t" };
const pdfText = (s: string) =>
  [...s.normalize("NFC")]
    .map((c) =>
      c.charCodeAt(0) <= 0xff || WIN_ANSI_EXTRA.has(c) ? c : (NO_DECOMPOSITION[c] ?? [...c.normalize("NFD")].filter((x) => x.charCodeAt(0) <= 0xff).join("")),
    )
    .join("")
    .replace(/[\u0000-\u001f]/g, " ")
    .replace(/ {2,}/g, " ")
    .trim();

const ordinal = (n: number | null) => (n ? `${n}.º` : "—");

function pace(ms: number | null, km: number) {
  if (ms === null || !km) return null;
  const s = Math.round(ms / 1000 / km);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Quebra o texto em linhas que caibam na largura dada. */
function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

function centered(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color = INK, maxWidth = 680) {
  // Reduz o tamanho se o texto (ex.: um nome muito comprido) não couber numa linha
  let s = size;
  while (s > 10 && font.widthOfTextAtSize(text, s) > maxWidth) s -= 1;
  const w = font.widthOfTextAtSize(text, s);
  page.drawText(text, { x: (page.getWidth() - w) / 2, y, size: s, font, color });
}

function spaced(page: PDFPage, text: string, y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, tracking: number) {
  const chars = [...text];
  const w = chars.reduce((sum, c) => sum + font.widthOfTextAtSize(c, size) + tracking, -tracking);
  let x = (page.getWidth() - w) / 2;
  for (const c of chars) {
    page.drawText(c, { x, y, size, font, color });
    x += font.widthOfTextAtSize(c, size) + tracking;
  }
}

export async function buildCertificate(resultId: string): Promise<{ pdf: Uint8Array; filename: string } | null> {
  const [r, settings] = await Promise.all([
    prisma.result.findUnique({
      where: { id: resultId },
      include: {
        event: { select: { slug: true, title: true, date: true, venue: true, city: true, resultsPublished: true } },
        distance: { select: { name: true, distanceKm: true } },
      },
    }),
    getSiteSettings(),
  ]);
  if (!r || !r.event.resultsPublished || r.status !== "terminou" || (r.chipTimeMs ?? r.gunTimeMs) === null) return null;

  const km = Number(r.distance.distanceKm);
  const time = msToHms(r.chipTimeMs ?? r.gunTimeMs)!;
  const brand = pdfText(settings.siteName);

  const doc = await PDFDocument.create();
  doc.setTitle(pdfText(`Certificado — ${r.name} — ${r.event.title}`));
  doc.setAuthor(brand);
  doc.setCreator(brand);
  const page = doc.addPage([841.89, 595.28]); // A4 horizontal
  const { width: W, height: H } = page.getSize();
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const regular = await doc.embedFont(StandardFonts.Helvetica);

  // Moldura e faixa com as cores da marca
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: rgb(1, 1, 1) });
  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: BRAND, borderWidth: 3 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: BRAND, borderWidth: 0.8 });
  const third = (W - 52) / 3;
  [BRAND, INK, SUN].forEach((color, i) => page.drawRectangle({ x: 26 + i * third, y: H - 34, width: third, height: 8, color }));
  page.drawCircle({ x: W - 40, y: H - 40, size: 90, color: SUN, opacity: 0.12 });
  page.drawCircle({ x: 40, y: 40, size: 110, color: BRAND, opacity: 0.08 });

  // Texto
  spaced(page, brand.toUpperCase(), H - 82, bold, 13, BRAND, 4);
  centered(page, "CERTIFICADO DE FINISHER", H - 128, bold, 36);
  centered(page, "Certificamos que", H - 165, regular, 14, GREY);
  centered(page, pdfText(r.name), H - 205, bold, 32);
  centered(page, pdfText(`Dorsal ${r.bib} · ${r.club}`), H - 228, regular, 12, GREY);

  const sentence = pdfText(
    `concluiu a prova ${r.distance.name} (${formatKm(km)}) do evento ${r.event.title}, realizado a ${formatDate(r.event.date.toISOString())}, em ${r.event.venue}, ${r.event.city}.`,
  );
  wrap(sentence, regular, 13, 560).forEach((line, i) => centered(page, line, H - 262 - i * 18, regular, 13, INK));

  // Caixas: tempo e classificações
  const boxes = [
    { label: r.chipTimeMs !== null ? "TEMPO CHIP" : "TEMPO OFICIAL", value: time, dark: true },
    { label: "CLASSIFICAÇÃO GERAL", value: ordinal(r.position) },
    { label: r.gender === "F" ? "POS. FEMININA" : "POS. MASCULINA", value: ordinal(r.positionGender) },
    { label: pdfText(r.ageGroup.toUpperCase()), value: ordinal(r.positionAgeGroup) },
  ];
  const bw = 150;
  const gap = 14;
  const bx = (W - (bw * 4 + gap * 3)) / 2;
  const by = 190;
  boxes.forEach((b, i) => {
    const x = bx + i * (bw + gap);
    page.drawRectangle({ x, y: by, width: bw, height: 64, color: b.dark ? INK : rgb(1, 1, 1), borderColor: b.dark ? INK : LIGHT, borderWidth: 1 });
    let ls = 8.5;
    while (ls > 6 && bold.widthOfTextAtSize(b.label, ls) > bw - 16) ls -= 0.5;
    page.drawText(b.label, { x: x + (bw - bold.widthOfTextAtSize(b.label, ls)) / 2, y: by + 44, size: ls, font: bold, color: b.dark ? SUN : GREY });
    page.drawText(b.value, { x: x + (bw - bold.widthOfTextAtSize(b.value, 24)) / 2, y: by + 14, size: 24, font: bold, color: b.dark ? rgb(1, 1, 1) : INK });
  });

  const extra = [pace(r.chipTimeMs ?? r.gunTimeMs, km) && `Ritmo médio: ${pace(r.chipTimeMs ?? r.gunTimeMs, km)} min/km`, r.gunTimeMs !== null && r.chipTimeMs !== null && `Tempo oficial: ${msToHms(r.gunTimeMs)}`]
    .filter(Boolean)
    .join("   ·   ");
  if (extra) centered(page, extra, 160, regular, 11, GREY);

  // Assinatura e verificação
  page.drawLine({ start: { x: W / 2 - 110, y: 98 }, end: { x: W / 2 + 110, y: 98 }, thickness: 0.8, color: GREY });
  centered(page, `Cronometragem oficial ${brand}`, 84, regular, 10, GREY);
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  if (site) centered(page, pdfText(`Confirme em ${site}/resultados/${r.event.slug}?q=${encodeURIComponent(r.bib)}`), 44, regular, 8, GREY);

  const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return { pdf: await doc.save(), filename: `certificado-${r.event.slug}-${slug(r.name) || r.bib}.pdf` };
}
