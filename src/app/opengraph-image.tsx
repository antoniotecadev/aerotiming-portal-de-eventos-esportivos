import { OG_SIZE, siteOgImage } from "@/server/og-image";

export const alt = "ConexãoSport — Eventos desportivos em Angola";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return siteOgImage();
}
