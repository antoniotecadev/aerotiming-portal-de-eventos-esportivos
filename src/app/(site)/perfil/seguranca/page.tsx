import type { Metadata } from "next";
import { SecuritySettings } from "@/components/profile/security-settings";

export const metadata: Metadata = { title: "Segurança" };

export default function SegurancaPage() {
  return <SecuritySettings />;
}
