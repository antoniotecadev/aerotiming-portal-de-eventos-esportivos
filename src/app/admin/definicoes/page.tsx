import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Definições" };

export default async function Page() {
  await requireAdminPage();
  return <SettingsForm />;
}
