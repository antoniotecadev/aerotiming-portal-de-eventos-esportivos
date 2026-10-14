import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const barlow = Barlow_Condensed({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-barlow", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "AeroTiming — Eventos desportivos em Angola",
    template: "%s · AeroTiming",
  },
  description:
    "Encontre corridas, caminhadas, ciclismo e trail em Angola. Inscreva-se em minutos, pague com Multicaixa e veja os seus resultados.",
  openGraph: { locale: "pt_AO", type: "website", siteName: "AeroTiming" },
};

export const viewport: Viewport = {
  themeColor: "#0e1a33",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-AO" className={`${jakarta.variable} ${barlow.variable}`}>
      <body className="min-h-dvh">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
