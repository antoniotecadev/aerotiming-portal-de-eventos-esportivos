"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CalendarCheck2, Home, LayoutDashboard, MapPin, Shield, Ticket, Trophy, UserRound, Users } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/components/auth/auth-provider";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { monthName, parseDate } from "@/lib/format";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/perfil", label: "Resumo", Icon: Home },
  { href: "/perfil/inscricoes", label: "Inscrições", Icon: Ticket },
  { href: "/perfil/resultados", label: "Resultados", Icon: Trophy },
  { href: "/perfil/dados", label: "Os meus dados", Icon: UserRound },
  { href: "/perfil/seguranca", label: "Segurança", Icon: Shield },
];

function ProfileSkeleton() {
  return (
    <div className="container-page py-8" aria-busy="true" aria-label="A carregar o perfil">
      <div className="h-40 animate-pulse rounded-3xl bg-ink-200/60" />
      <div className="mt-4 flex gap-2">
        {NAV.map((n) => (
          <div key={n.href} className="h-11 w-28 animate-pulse rounded-xl bg-ink-200/60" />
        ))}
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="h-56 animate-pulse rounded-2xl bg-ink-200/60" />
        <div className="h-56 animate-pulse rounded-2xl bg-ink-200/60" />
      </div>
    </div>
  );
}

export function ProfileShell({ children, stats: counts }: { children: React.ReactNode; stats: { registrations: number; finished: number; km: number } }) {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // A sessão é verificada no servidor (perfil/layout.tsx). Se a pessoa terminar sessão aqui, vai para o início.
  useEffect(() => {
    if (!user) router.replace("/");
  }, [user, router]);

  if (!user) return <ProfileSkeleton />;

  const since = user.createdAt ? parseDate(user.createdAt) : null;

  const stats = [
    { label: "Inscrições", value: counts.registrations, Icon: Ticket },
    { label: "Provas terminadas", value: counts.finished, Icon: CalendarCheck2 },
    { label: "Km em prova", value: counts.km, Icon: Trophy },
  ];

  return (
    <div className="pb-12">
      <section className="relative overflow-hidden bg-ink-900 text-white">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-600/25 blur-3xl" aria-hidden />
        <div className="container-page relative flex flex-col gap-6 py-8 sm:py-10 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <Avatar name={user.name} className="size-16 text-xl ring-4 ring-white/10 sm:size-20 sm:text-2xl" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-300">Olá,</p>
              <h1 className="truncate text-2xl font-extrabold tracking-tight sm:text-3xl">{user.name}</h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-300">
                {since && <span>Atleta desde {monthName(since.getMonth()).toLowerCase()} de {since.getFullYear()}</span>}
                {user.club && user.club !== "—" && (
                  <Badge tone="dark" className="gap-1">
                    <Users className="size-3.5" /> {user.club}
                  </Badge>
                )}
                {user.province && (
                  <Badge tone="dark" className="gap-1">
                    <MapPin className="size-3.5" /> {user.province}
                  </Badge>
                )}
              </div>
              {(user.role === "admin" || user.role === "organizador") && (
                <ButtonLink href="/admin" variant="white" size="sm" className="mt-3">
                  <LayoutDashboard /> Painel de gestão
                </ButtonLink>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map(({ label, value, Icon }) => (
              <div key={label} className="rounded-2xl bg-white/8 px-3 py-3 ring-1 ring-white/10 sm:min-w-32 sm:px-4">
                <dt className="flex items-center gap-1.5 text-xs font-semibold text-ink-300">
                  <Icon className="size-3.5 text-brand-400" /> {label}
                </dt>
                <dd className="mt-1 font-display text-3xl font-extrabold tabular">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <nav aria-label="Secções do perfil" className="sticky top-16 z-30 lg:top-18 border-b border-ink-200/70 bg-white/90 backdrop-blur">
        <div className="container-page">
          <ul className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4 py-2 sm:mx-0 sm:px-0">
            {NAV.map(({ href, label, Icon }) => {
              const active = href === "/perfil" ? pathname === href : pathname.startsWith(href);
              return (
                <li key={href} className="shrink-0">
                  <Link
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "inline-flex h-11 items-center gap-2 rounded-xl px-4 text-[15px] font-semibold transition-colors",
                      active ? "bg-ink-900 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100 hover:text-ink-900",
                    )}
                  >
                    <Icon className="size-4" />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>

      <div className="container-page pt-6 sm:pt-8">{children}</div>
    </div>
  );
}
