import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { SponsorsManager } from "@/components/admin/sponsors-manager";

export const metadata: Metadata = { title: "Patrocinadores" };

export default async function Page() {
  await requireAdminPage();
  return <SponsorsManager />;
}
