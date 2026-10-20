import type { Metadata } from "next";
import { ProfileShell } from "@/components/profile/profile-shell";
import { requireUser } from "@/server/auth";
import { listMyRegistrations, listMyResults } from "@/server/queries/profile";

export const metadata: Metadata = {
  title: { default: "O meu perfil", template: "%s · O meu perfil · AeroTiming" },
  robots: { index: false },
};

export default async function PerfilLayout({ children }: { children: React.ReactNode }) {
  // Verificação no servidor (o src/proxy.ts já redirecciona antes, com o caminho exacto em ?next=)
  const user = await requireUser("/perfil");
  const [registrations, results] = await Promise.all([listMyRegistrations(user.id), listMyResults(user.id)]);
  const finished = results.filter((r) => r.status === "terminou");
  const stats = {
    registrations: registrations.filter((r) => r.status === "confirmada" || r.status === "pagamento-pendente").length,
    finished: finished.length,
    km: Math.round(finished.reduce((acc, r) => acc + (r.distance?.distanceKm ?? 0), 0)),
  };
  return <ProfileShell stats={stats}>{children}</ProfileShell>;
}
