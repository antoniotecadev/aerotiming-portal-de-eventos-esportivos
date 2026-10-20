import type { Metadata } from "next";
import { MyResults } from "@/components/profile/my-results";
import { requireUser } from "@/server/auth";
import { listMyResults } from "@/server/queries/profile";

export const metadata: Metadata = { title: "Os meus resultados" };

export default async function MeusResultadosPage() {
  const user = await requireUser("/perfil/resultados");
  return <MyResults results={await listMyResults(user.id)} />;
}
