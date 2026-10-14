import type { Banner, Category, Sponsor } from "../types";

export const CATEGORIES: Category[] = [
  { slug: "corrida", name: "Corrida", description: "Corridas de rua: 5 km, 10 km, meia maratona e maratona." },
  { slug: "caminhada", name: "Caminhada", description: "Para toda a família, ao seu ritmo." },
  { slug: "ciclismo", name: "Ciclismo", description: "Provas de estrada e Gran Fondo." },
  { slug: "btt", name: "BTT", description: "Bicicleta de montanha em trilhos de terra." },
  { slug: "trail", name: "Trail", description: "Corrida em montanha e trilhos naturais." },
  { slug: "triatlo", name: "Triatlo", description: "Natação, ciclismo e corrida numa só prova." },
];

// 21 províncias (divisão político-administrativa em vigor desde 2025)
export const PROVINCES = [
  "Bengo", "Benguela", "Bié", "Cabinda", "Cuando", "Cuanza Norte", "Cuanza Sul", "Cubango",
  "Cunene", "Huambo", "Huíla", "Icolo e Bengo", "Luanda", "Lunda Norte", "Lunda Sul", "Malanje",
  "Moxico", "Moxico Leste", "Namibe", "Uíge", "Zaire",
];

export const SPONSORS: Sponsor[] = [
  { id: "sp-1", name: "Banco Palanca", logo: "/images/patrocinadores/banco-palanca.svg", url: "#", tier: "principal", active: true },
  { id: "sp-2", name: "Kianda Telecom", logo: "/images/patrocinadores/kianda-telecom.svg", url: "#", tier: "principal", active: true },
  { id: "sp-3", name: "Água Mupa", logo: "/images/patrocinadores/agua-mupa.svg", url: "#", tier: "oficial", active: true },
  { id: "sp-4", name: "Imbondeiro Seguros", logo: "/images/patrocinadores/imbondeiro-seguros.svg", url: "#", tier: "oficial", active: true },
  { id: "sp-5", name: "Rádio Marimba", logo: "/images/patrocinadores/radio-marimba.svg", url: "#", tier: "oficial", active: true },
  { id: "sp-6", name: "Mukanda Sports", logo: "/images/patrocinadores/mukanda-sports.svg", url: "#", tier: "apoio", active: true },
  { id: "sp-7", name: "Farmácia Saúde+", logo: "/images/patrocinadores/farmacia-saude.svg", url: "#", tier: "apoio", active: true },
  { id: "sp-8", name: "Kizomba Energia", logo: "/images/patrocinadores/kizomba-energia.svg", url: "#", tier: "apoio", active: true },
];

export const BANNERS: Banner[] = [
  {
    id: "bn-1",
    title: "Maratona Internacional de Luanda",
    subtitle: "22 de Novembro · Marginal de Luanda · 42, 21, 10 e 5 km",
    image: "/images/eventos/maratona-noite.jpg",
    ctaLabel: "Inscrever-me",
    href: "/eventos/maratona-internacional-de-luanda-2026",
    kind: "evento",
    active: true,
    order: 1,
  },
  {
    id: "bn-2",
    title: "Despeça-se de 2026 a correr",
    subtitle: "São Silvestre de Luanda · 31 de Dezembro · Últimas vagas",
    image: "/images/eventos/maratona.jpg",
    ctaLabel: "Garantir a minha vaga",
    href: "/eventos/sao-silvestre-de-luanda-2026",
    kind: "evento",
    active: true,
    order: 2,
  },
  {
    id: "bn-3",
    title: "Reviva o Ultra Trail do Namibe",
    subtitle: "Veja os resultados e as fotos da edição de 2026",
    image: "/images/eventos/trail.jpg",
    ctaLabel: "Ver resultados",
    href: "/resultados/ultra-trail-do-namibe-2026",
    kind: "memoria",
    active: true,
    order: 3,
  },
  {
    id: "bn-4",
    title: "Banco Palanca apoia o desporto angolano",
    subtitle: "Pague a sua inscrição com Multicaixa Express em segundos",
    image: "/images/eventos/ciclismo.jpg",
    ctaLabel: "Saber mais",
    href: "/ajuda#pagamentos",
    kind: "publicidade",
    active: true,
    order: 4,
  },
];
