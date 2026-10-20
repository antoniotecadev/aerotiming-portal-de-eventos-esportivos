import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata: Metadata = { title: "Nova palavra-passe", robots: { index: false } };

export default async function NovaPalavraPassePage() {
  // Só se chega aqui pelo link do e-mail, que inicia sessão. Sem sessão, o link expirou.
  if (!(await getCurrentUser())) redirect("/entrar?erro=link");
  return <NewPasswordForm />;
}
