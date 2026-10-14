"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Home, Search, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { isActive } from "./nav-links";

const TABS = [
  { href: "/", label: "Início", Icon: Home },
  { href: "/eventos", label: "Eventos", Icon: Search },
  { href: "/calendario", label: "Calendário", Icon: CalendarDays },
  { href: "/resultados", label: "Resultados", Icon: Trophy },
  { href: "/perfil", label: "Perfil", Icon: User },
];

/** Barra inferior no telemóvel — navegação com o polegar, ícone + texto. */
export function MobileTabBar() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-ink-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg lg:hidden" aria-label="Navegação rápida">
      <div className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link key={href} href={href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active ? "text-brand-600" : "text-ink-500")}>
              <span className={cn("flex h-7 w-12 items-center justify-center rounded-full transition-colors", active && "bg-brand-50")}>
                <Icon className="size-5" />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
