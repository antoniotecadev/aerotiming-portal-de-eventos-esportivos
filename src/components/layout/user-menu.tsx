"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronDown, LayoutDashboard, LogOut, PackageCheck, Ticket, Trophy, User as UserIcon } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";

export function UserMenu() {
  const { user, ready, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  if (!ready) return <div className="h-10 w-28 animate-pulse rounded-xl bg-ink-100" aria-hidden />;

  if (!user)
    return (
      <div className="flex items-center gap-2">
        <ButtonLink href="/entrar" variant="ghost" className="hidden sm:inline-flex">
          Entrar
        </ButtonLink>
        <ButtonLink href="/criar-conta" variant="primary">
          Criar conta
        </ButtonLink>
      </div>
    );

  const first = user.name.split(" ")[0];
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-ink-200 bg-white py-1 pr-3 pl-1 hover:bg-ink-50"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Avatar name={user.name} className="size-8 text-xs" />
        <span className="hidden text-sm font-semibold sm:inline">{first}</span>
        <ChevronDown className="size-4 text-ink-500" />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 animate-pop-in overflow-hidden rounded-2xl border border-ink-100 bg-white p-2 shadow-lift">
          <div className="px-3 py-2">
            <p className="font-semibold text-ink-900">{user.name}</p>
            <p className="truncate text-sm text-ink-500">{user.email}</p>
          </div>
          <div className="my-1 h-px bg-ink-100" />
          {[
            { href: "/perfil", label: "O meu perfil", Icon: UserIcon },
            { href: "/perfil/inscricoes", label: "As minhas inscrições", Icon: Ticket },
            { href: "/perfil/resultados", label: "Os meus resultados", Icon: Trophy },
            ...(user.role === "admin" || user.role === "organizador" ? [{ href: "/admin", label: "Painel de gestão", Icon: LayoutDashboard }] : []),
            ...(user.role === "admin" || (user.staffEvents ?? 0) > 0 ? [{ href: "/checkin", label: "Check-in de kits", Icon: PackageCheck }] : []),
          ].map(({ href, label, Icon }) => (
            <Link key={href} href={href} role="menuitem" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-ink-700 hover:bg-ink-50 hover:text-ink-900">
              <Icon className="size-4.5 text-ink-500" />
              {label}
            </Link>
          ))}
          <div className="my-1 h-px bg-ink-100" />
          <button
            role="menuitem"
            onClick={() => {
              logout();
              router.push("/");
            }}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] text-red-600 hover:bg-red-50"
          >
            <LogOut className="size-4.5" />
            Sair
          </button>
        </div>
      )}
    </div>
  );
}
