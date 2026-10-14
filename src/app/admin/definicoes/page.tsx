import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";

export const metadata: Metadata = { title: "Definições" };

export default function Page() {
  return <SettingsForm />;
}
