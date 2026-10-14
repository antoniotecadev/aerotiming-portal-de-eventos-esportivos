import type { Metadata } from "next";
import { RegistrationsManager } from "@/components/admin/registrations-manager";

export const metadata: Metadata = { title: "Inscrições" };

export default function Page() {
  return <RegistrationsManager />;
}
