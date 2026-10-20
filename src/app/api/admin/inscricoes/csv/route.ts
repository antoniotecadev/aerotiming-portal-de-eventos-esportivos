import { NextResponse, type NextRequest } from "next/server";
import { PAYMENT_STATUS } from "@/lib/format";
import { csvRow } from "@/lib/csv";
import { getCurrentUser, hasRole } from "@/server/auth";
import { exportAdminRegistrations } from "@/server/queries/admin-lists";

/** CSV das inscrições com os filtros do painel (12.10) — só dos eventos que a pessoa gere. */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!hasRole(user, "admin", "organizador")) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const sp = request.nextUrl.searchParams;
  const f = { q: sp.get("q") ?? undefined, evento: sp.get("evento") ?? undefined, distancia: sp.get("distancia") ?? undefined, pagamento: sp.get("pagamento") ?? undefined, kit: sp.get("kit") ?? undefined };
  const rows = await exportAdminRegistrations(user!, f);
  const csv = [
    csvRow(["Dorsal", "Nome", "Sexo", "Escalão", "Clube", "Província", "Nacionalidade", "Evento", "Distância", "Pagamento", "Valor (Kz)", "Kit", "Data de inscrição"]),
    ...rows.map((p) =>
      csvRow([p.bib, p.name, p.gender, p.ageGroup, p.club, p.province, p.nationality, p.eventTitle, p.distanceName, PAYMENT_STATUS[p.paymentStatus].label, p.price, p.kitPickedUp ? "Levantado" : "Por levantar", p.registeredAt.slice(0, 10)]),
    ),
  ].join("\r\n");
  return new NextResponse("\uFEFF" + csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="inscricoes${f.evento ? `-${f.evento.replace(/[^a-z0-9-]/gi, "")}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
