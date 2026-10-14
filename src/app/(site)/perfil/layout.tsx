import type { Metadata } from "next";
import { ProfileShell } from "@/components/profile/profile-shell";

export const metadata: Metadata = {
  title: { default: "O meu perfil", template: "%s · O meu perfil · AeroTiming" },
  robots: { index: false },
};

export default function PerfilLayout({ children }: { children: React.ReactNode }) {
  return <ProfileShell>{children}</ProfileShell>;
}
