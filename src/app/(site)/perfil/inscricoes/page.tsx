import type { Metadata } from "next";
import { RegistrationsList } from "@/components/profile/registrations-list";

export const metadata: Metadata = { title: "As minhas inscrições" };

export default function InscricoesPage() {
  return <RegistrationsList />;
}
