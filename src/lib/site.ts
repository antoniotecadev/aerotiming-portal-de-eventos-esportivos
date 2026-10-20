// Definições do site (contactos e redes sociais) — gravadas em site_settings → "site" pelo painel (Definições).

export interface SiteSettings {
  siteName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  linkedin: string;
  multicaixaEntity: string;
  bankName: string;
  iban: string;
  accountHolder: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  siteName: "ConexãoSport",
  tagline: "Eventos desportivos em Angola",
  email: "geral@conexaosport.ao",
  phone: "+244 923 000 000",
  whatsapp: "+244 923 000 000",
  address: "Talatona, Luanda — Angola",
  facebook: "https://facebook.com/conexaosport",
  instagram: "https://instagram.com/conexaosport",
  youtube: "",
  tiktok: "",
  linkedin: "",
  multicaixaEntity: "",
  bankName: "",
  iban: "",
  accountHolder: "",
};

/** Só os dígitos, com o indicativo de Angola (244) quando o número tem 9 dígitos. */
export function phoneDigits(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.length === 9 ? `244${d}` : d;
}

/** "+244 923 000 000" — para mostrar no site. */
export function formatPhone(phone: string) {
  const d = phoneDigits(phone);
  const m = /^244(\d{3})(\d{3})(\d{3})$/.exec(d);
  return m ? `+244 ${m[1]} ${m[2]} ${m[3]}` : phone;
}

/** "923 000 000" — sem o indicativo, para botões. */
export const localPhone = (phone: string) => formatPhone(phone).replace(/^\+244 /, "");

export const telHref = (phone: string) => `tel:+${phoneDigits(phone)}`;

export const whatsappHref = (phone: string, text?: string) =>
  `https://wa.me/${phoneDigits(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

export const mapsHref = (address: string) => `https://maps.google.com/?q=${encodeURIComponent(address)}`;
