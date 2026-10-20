import { NextResponse, type NextRequest } from "next/server";
import { buildCertificate } from "@/server/certificate";

/** Certificado de finisher em PDF (10.5). Público, como os resultados publicados. ?download=1 descarrega em vez de abrir. */
export async function GET(request: NextRequest, ctx: RouteContext<"/api/certificados/[id]">) {
  const { id } = await ctx.params;
  const cert = await buildCertificate(id);
  if (!cert) return NextResponse.json({ error: "Certificado não disponível." }, { status: 404 });
  const disposition = request.nextUrl.searchParams.has("download") ? "attachment" : "inline";
  return new NextResponse(Buffer.from(cert.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${disposition}; filename="${cert.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
