import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CreditCard, Medal, Search, ShieldCheck, Smartphone, Ticket, Timer, Trophy, UserPlus } from "lucide-react";
import { isOpen } from "@/lib/event-utils";
import { today } from "@/lib/today";
import { daysUntil, formatDate, formatKz } from "@/lib/format";
import { listEventsWithResults, listRecentEvents, listUpcomingEvents } from "@/server/queries/events";
import { listActiveBanners, listActiveSponsors, listCategories } from "@/server/queries/catalog";
import { listPodium } from "@/server/queries/results";
import { EventCard } from "@/components/events/event-card";
import { CATEGORY_TONE, CategoryIcon } from "@/components/events/category-icon";
import { HeroSearch } from "@/components/home/hero-search";
import { BannerCarousel } from "@/components/home/banner-carousel";
import { SponsorsStrip } from "@/components/home/sponsors-strip";
import { SectionHeading } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const STEPS = [
  { Icon: Search, title: "Escolha a prova", text: "Procure por nome, modalidade ou província e veja todos os detalhes." },
  { Icon: UserPlus, title: "Preencha os dados", text: "Só precisa do nome, BI e telemóvel. Demora menos de 3 minutos." },
  { Icon: CreditCard, title: "Pague e envie o comprovativo", text: "Multicaixa Express, transferência, depósito ou KWiK. Envie o comprovativo pelo WhatsApp." },
  { Icon: Medal, title: "Levante o kit e corra", text: "Mostre o bilhete no telemóvel, receba o dorsal e divirta-se!" },
];

export default async function HomePage() {
  const [allUpcoming, recent, banners, sponsors, categories, withResults] = await Promise.all([
    listUpcomingEvents(),
    listRecentEvents(4),
    listActiveBanners(),
    listActiveSponsors(),
    listCategories(),
    listEventsWithResults(),
  ]);
  const t = today();
  const featured = allUpcoming.find((e) => e.featured && isOpen(e)) ?? allUpcoming.find(isOpen);
  const recentIds = new Set(recent.map((e) => e.id));
  const upcoming = allUpcoming.filter((e) => !recentIds.has(e.id)).slice(0, 4);
  const lastRace = withResults[0]?.event;
  const lastResults = lastRace?.distances[0] ? await listPodium(lastRace.slug, lastRace.distances[0].id) : [];
  const podium = (g: "M" | "F") => lastResults.filter((r) => r.gender === g).sort((a, b) => a.positionGender! - b.positionGender!);
  const days = featured ? daysUntil(featured.date, t) : 0;
  const cheapest = allUpcoming.flatMap((e) => e.distances.map((d) => d.tiers[0]?.price ?? 0)).filter(Boolean);

  return (
    <>
      {/* HERO + PESQUISA */}
      <section className="relative overflow-hidden bg-ink-900">
        <Image src="/images/eventos/maratona-noite.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-25" />
        <div className="absolute inset-0 bg-linear-to-b from-ink-900/40 via-ink-900/80 to-ink-900" />
        <div className="pointer-events-none absolute -top-40 -right-40 size-130 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
        <div className="container-page relative grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-[1.25fr_1fr] lg:py-20">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm font-semibold text-sun-300 backdrop-blur">
              <Timer className="size-4" /> Cronometragem electrónica em todo o país
            </p>
            <h1 className="mt-5 text-4xl leading-[1.05] font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Encontre a sua próxima <span className="text-brand-400">prova</span> em Angola
            </h1>
            <p className="mt-4 max-w-xl text-lg text-ink-300">
              Corridas, caminhadas, ciclismo e trail. Inscreva-se em minutos, pague com Multicaixa e veja o seu tempo logo após a meta.
            </p>
            <div className="mt-8">
              <HeroSearch categories={categories} />
            </div>
          </div>

          {/* Evento em destaque */}
          {featured && (
<Link href={`/eventos/${featured.slug}`} className="group relative mx-auto hidden w-full max-w-sm lg:block">
            <div className="absolute -inset-3 rotate-3 rounded-3xl bg-brand-600/40" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl shadow-2xl ring-1 ring-white/10">
              <Image src={featured.poster} alt={`Cartaz: ${featured.title}`} width={1080} height={1528} sizes="384px" className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]" priority />
            </div>
            <div className="absolute -bottom-5 -left-6 flex items-center gap-3 rounded-2xl bg-white p-3 pr-5 shadow-lift">
              <div className="flex size-12 flex-col items-center justify-center rounded-xl bg-sun-400 text-ink-900">
                <span className="font-display text-xl leading-none font-extrabold">{days}</span>
                <span className="text-[10px] font-bold uppercase">dias</span>
              </div>
              <div>
                <p className="text-xs font-semibold text-ink-500">Em destaque</p>
                <p className="font-bold text-ink-900">Faltam {days} dias</p>
              </div>
            </div>
          </Link>
)}
        </div>
      </section>

      {/* CARROSSEL */}
      {banners.length > 0 && (
<section className="container-page pt-10 sm:pt-14">
        <BannerCarousel banners={banners} />
      </section>
)}

      {/* RECENTES */}
      <section className="container-page py-14 sm:py-20">
        <SectionHeading
          eyebrow="Novidades"
          title="Adicionados recentemente"
          description="Os eventos que acabaram de chegar ao portal. Garanta a sua vaga cedo — os preços sobem com o tempo."
          action={<ButtonLink href="/eventos" variant="outline">Ver todos os eventos <ArrowRight /></ButtonLink>}
        />
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {recent.map((e, i) => (
            <EventCard key={e.id} event={e} priority={i < 2} />
          ))}
        </div>
      </section>

      {/* MODALIDADES */}
      <section className="border-y border-ink-200/70 bg-white">
        <div className="container-page py-14">
          <SectionHeading eyebrow="Modalidades" title="O que gosta de fazer?" description="Toque numa modalidade para ver só esses eventos." />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => {
              const count = allUpcoming.filter((e) => e.category === c.slug).length;
              return (
                <Link key={c.slug} href={`/eventos?categoria=${c.slug}`} className="group flex flex-col gap-3 rounded-2xl border border-ink-200/70 bg-ink-50 p-4 transition hover:-translate-y-0.5 hover:border-brand-300 hover:bg-white hover:shadow-card">
                  <span className={cn("flex size-12 items-center justify-center rounded-xl", CATEGORY_TONE[c.slug])}>
                    <CategoryIcon slug={c.slug} className="size-6" />
                  </span>
                  <span>
                    <span className="block text-base font-bold text-ink-900">{c.name}</span>
                    <span className="text-sm text-ink-500">{count === 0 ? "Sem eventos" : count === 1 ? "1 evento" : `${count} eventos`}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* PRÓXIMOS */}
      {upcoming.length > 0 && (
        <section className="container-page py-14 sm:py-20">
          <SectionHeading
            eyebrow="Agenda"
            title="Próximas provas"
            action={<ButtonLink href="/calendario" variant="outline">Abrir calendário <ArrowRight /></ButtonLink>}
          />
          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            {upcoming.map((e) => (
              <EventCard key={e.id} event={e} layout="horizontal" />
            ))}
          </div>
        </section>
      )}

      {/* COMO FUNCIONA */}
      <section className="bg-ink-900">
        <div className="container-page py-14 sm:py-20">
          <SectionHeading invert eyebrow="Simples e seguro" title="Inscrever-se é fácil" description="Quatro passos e está pronto para a prova. Se tiver dúvidas, fale connosco pelo WhatsApp." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <span className="absolute top-5 right-5 font-display text-5xl leading-none font-extrabold text-white/10">{i + 1}</span>
                <span className="flex size-12 items-center justify-center rounded-xl bg-brand-600 text-white"><Icon className="size-6" /></span>
                <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
                <p className="mt-1.5 text-[15px] text-ink-300">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm font-semibold text-ink-300">
            <span className="flex items-center gap-2"><ShieldCheck className="size-5 text-emerald-400" /> Pagamento seguro</span>
            <span className="flex items-center gap-2"><Smartphone className="size-5 text-sky-400" /> Bilhete no telemóvel</span>
            <span className="flex items-center gap-2"><BadgeCheck className="size-5 text-sun-400" /> Resultados e certificado online</span>
          </div>
        </div>
      </section>

      {/* ÚLTIMOS RESULTADOS */}
      {lastRace && (
<section className="container-page py-14 sm:py-20">
        <div className="grid items-center gap-8 overflow-hidden rounded-3xl border border-ink-200/70 bg-white p-6 shadow-card sm:p-10 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="text-sm font-bold tracking-wide text-brand-600 uppercase">Resultados</p>
            <h2 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">{lastRace.title}</h2>
            <p className="mt-2 text-ink-600">{formatDate(lastRace.date)} · {lastRace.city}. Veja a classificação completa, o seu tempo e descarregue o certificado.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href={`/resultados/${lastRace.slug}`} variant="dark"><Trophy /> Ver classificação</ButtonLink>
              <ButtonLink href="/resultados" variant="outline">Todos os resultados</ButtonLink>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["M", "F"] as const).map((g) => (
              <div key={g} className="rounded-2xl bg-ink-50 p-4">
                <p className="mb-3 text-sm font-bold text-ink-700">{lastRace.distances[0].name} · {g === "M" ? "Masculino" : "Feminino"}</p>
                <ol className="space-y-2">
                  {podium(g).map((r) => (
                    <li key={r.id} className="flex items-center gap-3 rounded-xl bg-white p-2.5 shadow-sm">
                      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold", r.positionGender === 1 ? "bg-sun-400 text-ink-900" : r.positionGender === 2 ? "bg-ink-200 text-ink-800" : "bg-amber-700/80 text-white")}>
                        {r.positionGender}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold">{r.name}</span>
                      <span className="tabular text-sm font-bold text-ink-700">{r.chipTime}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>
)}

      {/* PATROCINADORES */}
      <section className="border-t border-ink-200/70 bg-white">
        <div className="container-page py-14">
          <SectionHeading className="mb-10 justify-center text-center sm:justify-center [&>div]:mx-auto" eyebrow="Quem nos apoia" title="Patrocinadores e parceiros" />
          <SponsorsStrip sponsors={sponsors} />
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-14 sm:py-20">
        <div className="relative overflow-hidden rounded-3xl bg-brand-600 px-6 py-12 text-white sm:px-12">
          <div className="pointer-events-none absolute -right-20 -bottom-24 size-80 rounded-full bg-sun-400/40 blur-2xl" aria-hidden />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1.5fr_1fr]">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Crie a sua conta grátis</h2>
              <p className="mt-3 max-w-xl text-lg text-brand-50">Guarde os seus dados para se inscrever mais rápido, acompanhe as inscrições, receba alertas de novas provas e veja todos os seus tempos.</p>
            </div>
            <div className="flex flex-wrap gap-3 lg:justify-end">
              <ButtonLink href="/criar-conta" variant="white" size="lg"><UserPlus /> Criar conta</ButtonLink>
              <ButtonLink href="/sobre#organizadores" size="lg" className="bg-ink-900 hover:bg-ink-800"><Ticket /> Organizar um evento</ButtonLink>
            </div>
          </div>
          <p className="relative mt-8 text-sm text-brand-100">{cheapest.length > 0 && <>Inscrições desde {formatKz(Math.min(...cheapest))} · </>}Pagamento em Kwanzas</p>
        </div>
      </section>
    </>
  );
}
