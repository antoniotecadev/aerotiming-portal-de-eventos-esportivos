import { NextResponse, type NextRequest } from "next/server";
import { GENDER_LABEL, RESULT_STATUS } from "@/lib/format";
import { csvRow } from "@/lib/csv";
import { listResults } from "@/server/queries/results";

/** Classificação completa de uma distância em CSV (5.10: gerada no servidor, já não vem toda para o browser). */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/resultados/[slug]/csv">) {
  const { slug } = await ctx.params;
  const distance = request.nextUrl.searchParams.get("distancia") ?? "";
  const rows = await listResults(slug, distance || undefined);
  if (!rows.length) return NextResponse.json({ error: "Sem resultados publicados." }, { status: 404 });
  const table = [
    ["Pos.", "Dorsal", "Nome", "Nacionalidade", "Sexo", "Escalão", "Clube", "Tempo chip", "Tempo oficial", "Ritmo (min/km)", "Pos. sexo", "Pos. escalão", "Estado"],
    ...rows.map((r) => [r.position, r.bib, r.name, r.nationality, GENDER_LABEL[r.gender], r.ageGroup, r.club, r.chipTime, r.gunTime, r.pace, r.positionGender, r.positionAgeGroup, RESULT_STATUS[r.status]]),
  ];
  const csv = table.map(csvRow).join("\r\n"); // com protecção contra fórmulas (12.4, B3)
  const name = `resultados-${slug}${distance ? `-${distance}` : ""}.csv`.replace(/[^a-z0-9.-]/gi, "-");
  return new NextResponse("\uFEFF" + csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"`, "Cache-Control": "no-store" },
  });
}
