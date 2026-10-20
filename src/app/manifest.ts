import type { MetadataRoute } from "next";

/** Manifest da app (ícone ao "Adicionar ao ecrã principal" no telemóvel). Ícones em public/favicon/. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ConexãoSport — Eventos desportivos em Angola",
    short_name: "ConexãoSport",
    description: "Inscrições, pagamentos e resultados de corridas, caminhadas, ciclismo e trail em Angola.",
    lang: "pt-AO",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0e1a33",
    icons: [
      { src: "/favicon/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "/favicon/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
