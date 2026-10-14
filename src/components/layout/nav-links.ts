export const MAIN_NAV = [
  { href: "/", label: "Início" },
  { href: "/eventos", label: "Eventos" },
  { href: "/calendario", label: "Calendário" },
  { href: "/resultados", label: "Resultados" },
  { href: "/sobre", label: "Sobre" },
  { href: "/ajuda", label: "Ajuda" },
];

export function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
