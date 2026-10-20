import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { Logo } from "./logo";
import { socialLinks } from "./social-icons";
import { formatPhone, telHref } from "@/lib/site";
import { listCategories } from "@/server/queries/catalog";
import { getSiteSettings } from "@/server/queries/site";

const COLUMNS = [
  {
    title: "Explorar",
    links: [
      { href: "/eventos", label: "Todos os eventos" },
      { href: "/calendario", label: "Calendário" },
      { href: "/resultados", label: "Resultados" },
      { href: "/eventos?estado=abertas", label: "Inscrições abertas" },
    ],
  },
  {
    title: "A minha conta",
    links: [
      { href: "/criar-conta", label: "Criar conta" },
      { href: "/entrar", label: "Entrar" },
      { href: "/perfil/inscricoes", label: "As minhas inscrições" },
      { href: "/perfil/resultados", label: "Os meus resultados" },
    ],
  },
  {
    title: "ConexãoSport",
    links: [
      { href: "/sobre", label: "Sobre nós" },
      { href: "/sobre#organizadores", label: "Organize o seu evento" },
      { href: "/ajuda", label: "Perguntas frequentes" },
      { href: "/contacto", label: "Contactos" },
    ],
  },
];

export async function SiteFooter() {
  const [categories, settings] = await Promise.all([listCategories(), getSiteSettings()]);
  return (
    <footer className="bg-ink-950 text-ink-300">
      <div className="h-1.5 bg-[linear-gradient(90deg,#e23d0b_0_33%,#0e1a33_33%_66%,#ffc21a_66%)]" aria-hidden />
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="space-y-5">
          <Logo invert />
          <p className="max-w-sm text-[15px] leading-relaxed text-ink-400">
            A forma mais simples de encontrar, inscrever-se e acompanhar eventos desportivos em Angola. Cronometragem electrónica e resultados na hora.
          </p>
          <ul className="space-y-2.5 text-[15px]">
            {settings.phone && <li className="flex items-center gap-3"><Phone className="size-4 text-brand-400" /> <a href={telHref(settings.phone)} className="hover:text-white">{formatPhone(settings.phone)}</a></li>}
            {settings.email && <li className="flex items-center gap-3"><Mail className="size-4 text-brand-400" /> <a href={`mailto:${settings.email}`} className="hover:text-white">{settings.email}</a></li>}
            {settings.address && <li className="flex items-center gap-3"><MapPin className="size-4 text-brand-400" /> {settings.address}</li>}
          </ul>
          <div className="flex gap-2 pt-1">
            {socialLinks(settings).map(({ name, href, Icon }) => (
              <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name} className="flex size-11 items-center justify-center rounded-xl bg-white/5 text-ink-300 transition-colors hover:bg-brand-600 hover:text-white">
                <Icon className="size-5" />
              </a>
            ))}
          </div>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h3 className="text-sm font-bold tracking-wide text-white uppercase">{col.title}</h3>
            <ul className="mt-4 space-y-3 text-[15px]">
              {col.links.map((l) => (
                <li key={l.href}><Link href={l.href} className="hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="container-page flex flex-wrap gap-x-5 gap-y-2 py-5 text-sm text-ink-400">
          <span className="font-semibold text-ink-300">Modalidades:</span>
          {categories.map((c) => (
            <Link key={c.slug} href={`/eventos?categoria=${c.slug}`} className="hover:text-white">{c.name}</Link>
          ))}
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container-page flex flex-col gap-3 py-6 pb-28 text-sm text-ink-500 sm:flex-row sm:items-center sm:justify-between lg:pb-6">
          <p>© {new Date().getFullYear()} {settings.siteName}. Todos os direitos reservados.</p>
          <div className="flex gap-5">
            <Link href="/termos" className="hover:text-white">Termos de uso</Link>
            <Link href="/privacidade" className="hover:text-white">Privacidade</Link>
            <span>Pagamentos com <strong className="text-ink-300">Multicaixa</strong></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
