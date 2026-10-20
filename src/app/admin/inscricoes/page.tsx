import type { Metadata } from "next";
import { RegistrationsManager } from "@/components/admin/registrations-manager";
import { requireUser } from "@/server/auth";
import { getAdminRegistrations, type RegistrationFilters } from "@/server/queries/admin-lists";

export const metadata: Metadata = { title: "Inscrições" };

export default async function Page({ searchParams }: { searchParams: Promise<RegistrationFilters> }) {
  const user = await requireUser("/admin/inscricoes");
  return <RegistrationsManager view={await getAdminRegistrations(user, await searchParams)} />;
}
