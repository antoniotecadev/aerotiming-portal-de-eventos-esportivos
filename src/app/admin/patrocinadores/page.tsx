import type { Metadata } from "next";
import { SponsorsManager } from "@/components/admin/sponsors-manager";

export const metadata: Metadata = { title: "Patrocinadores" };

export default function Page() {
  return <SponsorsManager />;
}
