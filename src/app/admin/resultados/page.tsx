import type { Metadata } from "next";
import { ResultsManager } from "@/components/admin/results-manager";

export const metadata: Metadata = { title: "Resultados" };

export default function Page() {
  return <ResultsManager />;
}
