import type { Metadata } from "next";
import { MyResults } from "@/components/profile/my-results";

export const metadata: Metadata = { title: "Os meus resultados" };

export default function MeusResultadosPage() {
  return <MyResults />;
}
