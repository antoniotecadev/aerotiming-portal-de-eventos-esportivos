"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  CalendarDays,
  ExternalLink,
  GalleryHorizontalEnd,
  Handshake,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Search,
  Settings,
  ShieldAlert,
  Tags,
  Ticket,
  Timer,
  Users,
  PackageCheck,
  Wallet,
  X,
} from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { LogoMark } from "@/components/layout/logo";
import { Avatar } from "@/components/ui/avatar";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { adminSearch } from "@/server/actions/admin-search";
import { AdminStoreProvider, normalize, useAdmin , type AdminData } from "./admin-store";

const NAV = [
  { href: "/admin", label: "Painel", icon: LayoutDashboard },
  { href: "/admin/eventos", label: "Eventos", icon: CalendarDays },
  { href: "/admin/inscricoes", label: "Inscrições", icon: Ticket },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: Wallet },
  { href: "/admin/resultados", label: "Resultados", icon: Timer },
  { href: "/checkin", label: "Check-in de kits", icon: PackageCheck },
  { href: "/admin/utilizadores", label: "Utilizadores", icon: Users },
  { href: "/admin/mensagens", label: "Mensagens", icon: Mail },
  { href: "/admin/banners", label: "Banners (carrossel)", icon: GalleryHorizontalEnd },
  { href: "/admin/patrocinadores", label: "Patrocinadores", icon: Handshake },
  { href: "/admin/categorias", label: "Categorias", icon: Tags },
  { href: "/admin/definicoes", label: "Definições", icon: Settings },
];

/** Áreas só para o admin; o organizador não as vê (e o servidor também as bloqueia). */
const ADMIN_ONLY = new Set(["/admin/utilizadores", "/admin/mensagens", "/admin/banners", "/admin/patrocinadores", "/admin/categorias", "/admin/definicoes"]);

export function AdminShell({ children, initialData }: { children: React.ReactNode; initialData: AdminData }) {
  // O acesso já foi verificado no servidor (src/app/admin/layout.tsx).
  return (
    <AdminStoreProvider initial={initialData}>
      <Frame>{children}</Frame>
    </AdminStoreProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh bg-ink-50">
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 lg:block">
        <Sidebar />
      </aside>

      {/* Drawer (telemóvel) */}
      {open && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-ink-950/60" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fade-in shadow-lift">
            <Sidebar onClose={() => setOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-h-dvh min-w-0 flex-col lg:pl-64">
        <TopBar onMenu={() => setOpen(true)} />
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  return (
    <nav className="flex h-full flex-col bg-ink-900 text-ink-300" aria-label="Gestão">
      <div className="flex h-16 items-center justify-between gap-2 border-b border-white/10 px-5">
        <Link href="/admin" className="flex items-center gap-2">
          <LogoMark className="size-8" />
          <span className="font-display text-[22px] leading-none font-extrabold tracking-tight text-white italic">
            Conexão<span className="text-brand-500">Sport</span>
          </span>
          <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-sun-400 uppercase">Gestão</span>
        </Link>
        {onClose && (
          <button onClick={onClose} className="rounded-lg p-2 text-ink-400 hover:bg-white/10 hover:text-white" aria-label="Fechar menu">
            <X className="size-5" />
          </button>
        )}
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {NAV.filter((item) => isAdmin || !ADMIN_ONLY.has(item.href)).map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold transition-colors",
                  active ? "bg-brand-600 text-white shadow-sm" : "hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-5 shrink-0" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link href="/" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold hover:bg-white/5 hover:text-white">
          <ExternalLink className="size-4" /> Ver site
        </Link>
      </div>
    </nav>
  );
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menu, setMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menu]);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-ink-200/70 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <button onClick={onMenu} className="-ml-1 rounded-lg p-2 text-ink-700 hover:bg-ink-100 lg:hidden" aria-label="Abrir menu">
        <Menu className="size-6" />
      </button>
      <GlobalSearch />
      <div className="ml-auto flex items-center gap-2">
        <ButtonLink href="/" variant="ghost" size="sm" className="hidden sm:inline-flex" target="_blank">
          <ExternalLink /> Ver site
        </ButtonLink>
        <div ref={ref} className="relative">
          <button onClick={() => setMenu((m) => !m)} className="flex items-center gap-2 rounded-full p-0.5 hover:bg-ink-100 sm:pr-3" aria-expanded={menu} aria-label="Menu do utilizador">
            <Avatar name={user?.name ?? "?"} className="size-9 text-xs" />
            <span className="hidden max-w-40 truncate text-sm font-semibold text-ink-800 sm:block">{user?.name}</span>
          </button>
          {menu && (
            <div className="absolute right-0 mt-2 w-64 animate-pop-in overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift">
              <div className="border-b border-ink-100 px-4 py-3">
                <p className="truncate font-semibold text-ink-900">{user?.name}</p>
                <p className="truncate text-sm text-ink-500">{user?.email}</p>
                <p className="mt-1 text-xs font-bold tracking-wide text-brand-600 uppercase">{user?.role === "admin" ? "Administrador" : "Organizador"}</p>
              </div>
              <Link href="/" className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-medium text-ink-700 hover:bg-ink-50 sm:hidden">
                <ExternalLink className="size-4" /> Ver site
              </Link>
              <button
                onClick={() => {
                  logout();
                  router.push("/");
                }}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50"
              >
                <LogOut className="size-4" /> Sair
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function GlobalSearch() {
  const { data } = useAdmin();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
    setQ("");
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // Eventos: já estão no painel. Inscrições e utilizadores: pesquisa no servidor quando se pára de escrever (12.10)
  const [remote, setRemote] = useState<{ term: string; participants: { id: string; name: string; bib: string; eventSlug: string; eventTitle: string }[]; users: { id: string; name: string; email: string }[] } | null>(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return setRemote(null);
    let alive = true;
    const t = setTimeout(async () => {
      const res = await adminSearch(term).catch(() => ({ participants: [], users: [] }));
      if (alive) setRemote({ term, ...res });
    }, 300);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

  const results = useMemo(() => {
    const n = normalize(q.trim());
    if (n.length < 2) return null;
    const fresh = remote?.term === q.trim();
    return {
      events: data.events.filter((e) => normalize(`${e.title} ${e.city}`).includes(n)).slice(0, 4),
      participants: fresh ? remote!.participants : [],
      users: fresh ? remote!.users : [],
      loading: !fresh,
    };
  }, [q, data.events, remote]);

  const empty = results && !results.loading && !results.events.length && !results.participants.length && !results.users.length;

  return (
    <div ref={ref} className="relative w-full max-w-md min-w-0">
      <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-400" aria-hidden />
      <input
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Pesquisar eventos, atletas, dorsais…"
        aria-label="Pesquisar no painel"
        className="h-10 w-full rounded-xl border border-ink-200 bg-ink-50 pr-3 pl-10 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
      />
      {open && results && (
        <div className="absolute inset-x-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-ink-200 bg-white py-2 shadow-lift">
          {empty && <p className="px-4 py-3 text-sm text-ink-500">Sem resultados para “{q}”.</p>}
          {results.loading && <p className="px-4 py-2 text-xs text-ink-400">A procurar inscrições…</p>}
          {results.events.length > 0 && (
            <SearchGroup label="Eventos">
              {results.events.map((e) => (
                <SearchLink key={e.id} href={`/admin/eventos/${e.id}`} title={e.title} sub={`${e.city} · ${e.date}`} />
              ))}
            </SearchGroup>
          )}
          {results.participants.length > 0 && (
            <SearchGroup label="Inscrições">
              {results.participants.map((p) => (
                <SearchLink key={p.id} href={`/admin/inscricoes?q=${encodeURIComponent(p.bib)}&evento=${p.eventSlug}`} title={`${p.name} · #${p.bib}`} sub={p.eventTitle} />
              ))}
            </SearchGroup>
          )}
          {results.users.length > 0 && (
            <SearchGroup label="Utilizadores">
              {results.users.map((u) => (
                <SearchLink key={u.id} href={`/admin/utilizadores?q=${encodeURIComponent(u.email)}`} title={u.name} sub={u.email} />
              ))}
            </SearchGroup>
          )}
        </div>
      )}
    </div>
  );
}

function SearchGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="px-4 py-1 text-xs font-bold tracking-wide text-ink-400 uppercase">{label}</p>
      {children}
    </div>
  );
}

function SearchLink({ href, title, sub }: { href: string; title: string; sub: string }) {
  return (
    <Link href={href} className="block px-4 py-2 hover:bg-ink-50">
      <p className="truncate text-sm font-semibold text-ink-900">{title}</p>
      <p className="truncate text-xs text-ink-500">{sub}</p>
    </Link>
  );
}
