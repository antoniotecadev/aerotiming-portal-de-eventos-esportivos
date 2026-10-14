"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./logo";
import { MAIN_NAV, isActive } from "./nav-links";
import { UserMenu } from "./user-menu";

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className={cn("sticky top-0 z-50 border-b bg-white/90 backdrop-blur-lg transition-shadow", scrolled ? "border-ink-200/80 shadow-sm" : "border-transparent")}>
      <div className="container-page flex h-16 items-center gap-4 lg:h-18">
        <Logo />
        <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Principal">
          {MAIN_NAV.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors",
                isActive(pathname, l.href) ? "bg-brand-50 text-brand-700" : "text-ink-600 hover:bg-ink-50 hover:text-ink-900",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/eventos" className="hidden size-10 items-center justify-center rounded-xl text-ink-600 hover:bg-ink-100 sm:flex lg:hidden" aria-label="Pesquisar eventos">
            <Search className="size-5" />
          </Link>
          <UserMenu />
          <button onClick={() => setOpen((v) => !v)} className="flex size-10 items-center justify-center rounded-xl text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Abrir menu" aria-expanded={open}>
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="animate-fade-in border-t border-ink-100 bg-white lg:hidden" aria-label="Menu">
          <div className="container-page grid gap-1 py-3">
            {MAIN_NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn("rounded-xl px-4 py-3.5 text-base font-semibold", isActive(pathname, l.href) ? "bg-brand-50 text-brand-700" : "text-ink-800 hover:bg-ink-50")}
              >
                {l.label}
              </Link>
            ))}
            <Link href="/entrar" className="rounded-xl px-4 py-3.5 text-base font-semibold text-ink-800 hover:bg-ink-50 sm:hidden">
              Entrar na minha conta
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
