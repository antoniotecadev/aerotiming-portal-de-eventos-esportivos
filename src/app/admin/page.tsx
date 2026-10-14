import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/dashboard";

export const metadata: Metadata = { title: "Painel" };

export default function Page() {
  return <Dashboard />;
}
