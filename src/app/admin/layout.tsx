import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser, hasRole } from "@/server/auth";
import { getAdminData } from "@/server/queries/admin";

export const metadata: Metadata = {
  title: { default: "Gestão", template: "%s · Gestão AeroTiming" },
  robots: { index: false, follow: false },
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // Verificação no SERVIDOR: só admin e organizador entram no painel (staff → check-in, tarefa 7.6).
  const user = await getCurrentUser();
  if (!hasRole(user, "admin", "organizador")) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-50 px-4">
        <div className="w-full max-w-md rounded-3xl border border-ink-200/70 bg-white p-8 text-center shadow-card">
          <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <ShieldAlert className="size-7" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold text-ink-900">Acesso restrito</h1>
          <p className="mt-2 text-ink-600">
            {user
              ? "A sua conta não tem permissões para o painel de gestão. Se organiza eventos, peça acesso na página “Organize o seu evento”."
              : "O painel de gestão é reservado a administradores e organizadores. Entre na sua conta para continuar."}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {user ? <ButtonLink href="/contacto?assunto=organizar">Pedir acesso</ButtonLink> : <ButtonLink href="/entrar?next=/admin">Entrar</ButtonLink>}
            <ButtonLink href="/" variant="outline">
              Voltar ao site
            </ButtonLink>
          </div>
        </div>
      </div>
    );
  }
  return <AdminShell initialData={await getAdminData(user!)}>{children}</AdminShell>;
}
