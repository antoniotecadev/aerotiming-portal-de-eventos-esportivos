import type { Metadata } from "next";
import { PersonalDataForm } from "@/components/profile/personal-data-form";

export const metadata: Metadata = { title: "Os meus dados" };

export default function DadosPage() {
  return <PersonalDataForm />;
}
