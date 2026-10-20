import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { BannersManager } from "@/components/admin/banners-manager";

export const metadata: Metadata = { title: "Banners" };

export default async function Page() {
  await requireAdminPage();
  return <BannersManager />;
}
