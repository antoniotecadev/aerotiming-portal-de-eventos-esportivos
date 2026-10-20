import type { Metadata } from "next";
import { RegistrationsList } from "@/components/profile/registrations-list";
import { requireUser } from "@/server/auth";
import { listMyRegistrations } from "@/server/queries/profile";
import { today } from "@/lib/today";

export const metadata: Metadata = { title: "As minhas inscrições" };

export default async function InscricoesPage() {
  const user = await requireUser("/perfil/inscricoes");
  return <RegistrationsList registrations={await listMyRegistrations(user.id)} today={today()} />;
}
