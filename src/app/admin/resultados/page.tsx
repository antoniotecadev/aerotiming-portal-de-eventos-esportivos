import type { Metadata } from "next";
import { ResultsManager } from "@/components/admin/results-manager";
import { requireUser } from "@/server/auth";
import { defaultResultsTarget, getDistanceResults } from "@/server/queries/admin-lists";

export const metadata: Metadata = { title: "Resultados" };

/** Só o evento e a distância escolhidos (?evento=…&distancia=…) são carregados (12.10). */
export default async function Page({ searchParams }: { searchParams: Promise<{ evento?: string; distancia?: string }> }) {
  const user = await requireUser("/admin/resultados");
  const sp = await searchParams;
  const target = sp.evento ? { evento: sp.evento, distancia: sp.distancia ?? "" } : await defaultResultsTarget(user);
  const data = target?.evento && target.distancia ? await getDistanceResults(user, target.evento, target.distancia) : null;
  return <ResultsManager eventSlug={target?.evento ?? ""} distanceId={target?.distancia ?? ""} data={data} />;
}
