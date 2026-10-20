import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  AlertCircle, CalendarDays, CalendarClock, Check, ChevronRight, Clock, Download, ExternalLink, FileText, Gift, Mail,
  MapPin, Navigation, Phone, ShieldCheck, Ticket, Trophy, Users,
} from "lucide-react";
import { currentTier, isOpen, minPrice } from "@/lib/event-utils";
import { today } from "@/lib/today";
import { getEventBySlug } from "@/server/queries/events";
import { getParticipantStats } from "@/server/queries/registrations";
import { PAYMENT_STATUS, daysUntil, formatDate, formatDateShort, formatKm, formatKz, weekday } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { CATEGORY_TONE, CategoryIcon } from "@/components/events/category-icon";
import { PosterViewer } from "@/components/events/poster-lightbox";
import { RouteViewer } from "@/components/events/route-viewer";
import { SectionNav } from "@/components/events/section-nav";
import { ShareButtons } from "@/components/events/share-buttons";
import { AlertButton } from "@/components/events/alert-button";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await getEventBySlug(slug);
  if (!e) return {};
  return {
    title: e.title,
    description: `${formatDate(e.date)} · ${e.venue}, ${e.city}. ${e.summary}`,
    openGraph: { images: [{ url: e.poster, width: 1080, height: 1528 }] },
  };
}

function Section({ id, title, icon, children, action }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-36 rounded-3xl border border-ink-200/70 bg-white p-5 shadow-card sm:p-7">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-3 text-xl font-extrabold tracking-tight">
          <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 [&_svg]:size-5">{icon}</span>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  const TODAY = today();
  const open = isOpen(event);
  const finished = event.status === "terminado";
  const days = daysUntil(event.date, TODAY);
  const stats = await getParticipantStats(event.id);
  const sponsors = event.sponsors ?? [];
  const href = `/eventos/${event.slug}`;
  const regHref = `${href}/inscricao`;

  const facts = [
    { Icon: CalendarDays, label: "Data", value: formatDate(event.date), sub: weekday(event.date) },
    { Icon: Clock, label: "Hora de partida", value: event.startTime, sub: "Hora de Luanda" },
    { Icon: MapPin, label: "Local", value: event.venue, sub: `${event.city}, ${event.province}` },
    { Icon: CalendarClock, label: "Inscrições até", value: formatDate(event.registrationCloses, false), sub: open ? "Não deixe para a última hora" : event.status === "brevemente" ? `Abrem a ${formatDate(event.registrationOpens, false)}` : "Encerradas" },
  ];

  const nav = [
    { id: "sobre", label: "Sobre" },
    { id: "precos", label: "Distâncias e preços" },
    { id: "percurso", label: "Percurso" },
    { id: "kit", label: "Kit e levantamento" },
    { id: "programa", label: "Programa" },
    { id: "regulamento", label: "Regulamento" },
    { id: "inscritos", label: "Inscritos" },
    { id: "local", label: "Como chegar" },
  ];

  const CTA = ({ className }: { className?: string }) =>
    open ? (
      <ButtonLink href={regHref} size="lg" className={className}><Ticket /> Inscrever-me agora</ButtonLink>
    ) : finished && event.resultsPublished ? (
      <ButtonLink href={`/resultados/${event.slug}`} size="lg" variant="dark" className={className}><Trophy /> Ver resultados</ButtonLink>
    ) : event.status === "brevemente" ? (
      <AlertButton eventSlug={event.slug} className={className} />
    ) : (
      <span className={cn("inline-flex h-13 items-center justify-center rounded-xl bg-ink-100 px-6 font-bold text-ink-500", className)}>Inscrições encerradas</span>
    );

  return (
    <>
      {/* TOPO */}
      <div className="border-b border-ink-200/70 bg-white">
        <div className="container-page py-6 sm:py-8">
          <nav aria-label="Caminho" className="mb-6 flex items-center gap-1.5 text-sm text-ink-500">
            <Link href="/" className="hover:text-ink-900">Início</Link>
            <ChevronRight className="size-3.5" />
            <Link href="/eventos" className="hover:text-ink-900">Eventos</Link>
            <ChevronRight className="size-3.5" />
            <span className="truncate font-semibold text-ink-800">{event.title}</span>
          </nav>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,400px)_1fr] lg:gap-12">
            <div className="mx-auto w-full max-w-[400px]">
              <PosterViewer src={event.poster} alt={event.title} className="aspect-[1080/1528] rounded-3xl bg-ink-100 shadow-lift" sizes="400px" priority />
              <a href={event.poster} download className="mt-3 flex items-center justify-center gap-2 text-sm font-semibold text-ink-600 hover:text-brand-700">
                <Download className="size-4" /> Descarregar cartaz
              </a>
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={event.status} />
                <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold", CATEGORY_TONE[event.category])}>
                  <CategoryIcon slug={event.category} className="size-3.5" /> {event.categoryName ?? event.category}
                </span>
                <Badge>{event.edition}.ª edição</Badge>
              </div>
              <h1 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight sm:text-4xl">{event.title}</h1>
              <p className="mt-3 text-lg text-ink-600">{event.summary}</p>

              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                {facts.map(({ Icon, label, value, sub }) => (
                  <div key={label} className="flex gap-3 rounded-2xl bg-ink-50 p-4">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600 shadow-sm"><Icon className="size-5" /></span>
                    <div className="min-w-0">
                      <dt className="text-sm text-ink-500">{label}</dt>
                      <dd className="font-bold text-ink-900">{value}</dd>
                      <dd className="text-sm text-ink-500">{sub}</dd>
                    </div>
                  </div>
                ))}
              </dl>

              {/* Preços rápidos */}
              <div className="mt-6">
                <p className="mb-2 text-sm font-bold text-ink-700">Distâncias</p>
                <div className="flex flex-wrap gap-2">
                  {event.distances.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-2 rounded-xl border border-ink-200 bg-white px-3 py-2 text-[15px]">
                      <strong>{formatKm(d.distanceKm)}</strong>
                      {!finished && <span className="text-ink-500">{formatKz(currentTier(d, TODAY).price)}</span>}
                    </span>
                  ))}
                </div>
              </div>

              {!finished && days >= 0 && (
                <div className="mt-6 flex items-center gap-3 rounded-2xl border border-sun-400/50 bg-sun-400/10 p-4">
                  <span className="font-display text-4xl leading-none font-extrabold text-ink-900">{days}</span>
                  <p className="text-[15px] text-ink-700">{days === 1 ? "dia" : "dias"} até à prova{open && event.distances.some((d) => d.totalSlots - d.slotsTaken < 300) && <> · <strong className="text-amber-800">algumas distâncias com poucas vagas</strong></>}</p>
                </div>
              )}

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                <CTA className="sm:min-w-56" />
                <ButtonLink href={`${href}/inscritos`} variant="outline" size="lg"><Users /> Ver inscritos ({stats.total})</ButtonLink>
              </div>
              <div className="mt-5"><ShareButtons title={event.title} path={href} /></div>
            </div>
          </div>
        </div>
      </div>

      <SectionNav items={nav} />

      <div className="container-page grid gap-6 py-8 pb-32 lg:grid-cols-[1fr_340px] lg:pb-12">
        <div className="min-w-0 space-y-6">
          <Section id="sobre" title="Sobre o evento" icon={<FileText />}>
            <div className="space-y-3 text-[16px] leading-relaxed text-ink-700">
              {event.description.map((p) => <p key={p}>{p}</p>)}
            </div>
            <ul className="mt-5 flex flex-wrap gap-2">
              {event.highlights.map((h) => (
                <li key={h} className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-800"><Check className="size-4" /> {h}</li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink-100 pt-5 text-[15px] text-ink-600">
              <span><strong className="text-ink-900">Organização:</strong> {event.organizer.name}</span>
              <a href={`tel:${event.organizer.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1.5 hover:text-brand-700"><Phone className="size-4" /> {event.organizer.phone}</a>
              <a href={`mailto:${event.organizer.email}`} className="inline-flex items-center gap-1.5 hover:text-brand-700"><Mail className="size-4" /> {event.organizer.email}</a>
            </div>
          </Section>

          <Section id="precos" title="Distâncias e preços" icon={<Ticket />}>
            <div className="grid gap-4 md:grid-cols-2">
              {event.distances.map((d) => {
                const tier = currentTier(d, TODAY);
                const left = d.totalSlots - d.slotsTaken;
                const pct = Math.round((d.slotsTaken / d.totalSlots) * 100);
                return (
                  <article key={d.id} className="flex flex-col rounded-2xl border border-ink-200 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-bold">{d.name}</h3>
                        <p className="text-sm text-ink-500">Partida às {d.startTime} · Idade mínima {d.minAge === 0 ? "livre" : `${d.minAge} anos`}</p>
                      </div>
                      {!finished && <p className="text-right"><span className="block text-xl font-extrabold whitespace-nowrap text-ink-900">{formatKz(tier.price)}</span><span className="text-xs text-ink-500">{tier.label}</span></p>}
                    </div>
                    {d.tiers.length > 1 && (
                      <ul className="mt-4 space-y-1.5 rounded-xl bg-ink-50 p-3 text-sm">
                        {d.tiers.map((t) => {
                          const past = t.until < TODAY;
                          const now = t === tier;
                          return (
                            <li key={t.label} className={cn("flex justify-between gap-3", past && "text-ink-400 line-through", now && "font-bold text-ink-900")}>
                              <span>{t.label} (até {formatDateShort(t.until)}){now && " ← agora"}</span>
                              <span className="whitespace-nowrap">{formatKz(t.price)}</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                    {!finished && (
                      <div className="mt-4">
                        <div className="flex justify-between text-sm"><span className="text-ink-500">Vagas</span><span className={cn("font-semibold", left === 0 ? "text-red-600" : left < 300 ? "text-amber-700" : "text-ink-700")}>{left === 0 ? "Esgotado" : `Restam ${left} de ${d.totalSlots}`}</span></div>
                        <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-ink-100"><div className={cn("h-full rounded-full", pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} /></div>
                      </div>
                    )}
                    {open && left > 0 && <ButtonLink href={`${regHref}?distancia=${d.id}`} className="mt-5 w-full">Escolher {formatKm(d.distanceKm)}</ButtonLink>}
                  </article>
                );
              })}
            </div>
            <p className="mt-5 flex items-start gap-2 rounded-xl bg-sky-50 p-4 text-[15px] text-sky-900">
              <AlertCircle className="mt-0.5 size-5 shrink-0" /> O preço inclui o kit do atleta, dorsal com chip, seguro, abastecimentos e medalha para quem terminar. Pagamento em Kwanzas por Multicaixa Express, transferência, depósito ou KWiK; envia o comprovativo pelo WhatsApp e a organização confirma.
            </p>
          </Section>

          <Section id="percurso" title="Percurso" icon={<Navigation />}>
            <RouteViewer routes={event.routes} distances={event.distances} />
          </Section>

          <Section id="kit" title="Kit do atleta e levantamento" icon={<Gift />}>
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="mb-3 font-bold">O que recebe</h3>
                <ul className="space-y-2">
                  {event.kit.items.map((i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[15px] text-ink-700"><span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Check className="size-3.5" /></span>{i}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl bg-ink-50 p-5">
                <h3 className="mb-3 font-bold">Onde e quando levantar</h3>
                <p className="flex items-start gap-2 text-[15px]"><MapPin className="mt-0.5 size-4.5 shrink-0 text-brand-600" /><span><strong>{event.kit.location}</strong><br /><span className="text-ink-600">{event.kit.address}</span></span></p>
                <ul className="mt-4 space-y-2">
                  {event.kit.pickup.map((p) => (
                    <li key={p.date} className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 text-[15px] shadow-sm">
                      <span className="font-semibold">{formatDateShort(p.date)}</span>
                      <span className="text-ink-600">{p.from} – {p.to}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <ul className="mt-5 space-y-2 border-t border-ink-100 pt-5">
              {event.kit.notes.map((n) => (
                <li key={n} className="flex items-start gap-2.5 text-[15px] text-ink-700"><AlertCircle className="mt-0.5 size-4.5 shrink-0 text-amber-600" />{n}</li>
              ))}
            </ul>
          </Section>

          <Section id="programa" title="Programa do dia" icon={<Clock />}>
            <ol className="relative space-y-1 before:absolute before:top-3 before:bottom-3 before:left-[52px] before:w-px before:bg-ink-200">
              {event.schedule.map((s) => (
                <li key={s.time + s.activity} className="relative flex items-center gap-4 py-2">
                  <span className="tabular w-11 text-right text-[15px] font-bold text-ink-900">{s.time}</span>
                  <span className="relative z-10 size-3 shrink-0 rounded-full border-2 border-white bg-brand-600 ring-2 ring-brand-200" />
                  <span className="text-[15px] text-ink-700">{s.activity}</span>
                </li>
              ))}
            </ol>
          </Section>

          <Section id="regulamento" title="Regulamento" icon={<ShieldCheck />} action={<a href="#" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><Download className="size-4" /> Descarregar PDF</a>}>
            <div className="divide-y divide-ink-100 overflow-hidden rounded-2xl border border-ink-200">
              {event.regulation.map((r, i) => (
                <details key={r.title} className="group" open={i === 0}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-[15px] font-bold hover:bg-ink-50 [&::-webkit-details-marker]:hidden">
                    {r.title}
                    <ChevronRight className="size-5 shrink-0 text-ink-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <ul className="space-y-2 px-5 pb-5">
                    {r.items.map((it) => <li key={it} className="flex gap-2.5 text-[15px] leading-relaxed text-ink-700"><span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-brand-500" />{it}</li>)}
                  </ul>
                </details>
              ))}
            </div>
          </Section>

          <Section id="inscritos" title="Lista de inscritos" icon={<Users />} action={<ButtonLink href={`${href}/inscritos`} variant="outline" size="sm">Ver lista completa</ButtonLink>}>
            <div className="mb-4 grid grid-cols-3 gap-2 text-center">
              {[
                { label: "Inscritos", value: stats.total },
                { label: "Pagos", value: stats.confirmed },
                { label: "Províncias", value: stats.provinces },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-ink-50 p-3">
                  <p className="font-display text-3xl font-extrabold">{s.value}</p>
                  <p className="text-sm text-ink-500">{s.label}</p>
                </div>
              ))}
            </div>
            <ul className="divide-y divide-ink-100">
              {stats.latest.map((p) => {
                const ps = PAYMENT_STATUS[p.paymentStatus];
                return (
                  <li key={p.id} className="flex items-center gap-3 py-3">
                    <span className="tabular w-14 shrink-0 rounded-lg bg-ink-900 py-1 text-center text-sm font-bold text-white">{p.bib}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{p.name}</span>
                      <span className="text-sm text-ink-500">{event.distances.find((d) => d.id === p.distanceId)?.name} · {p.club}</span>
                    </span>
                    <Badge tone={ps.tone}>{ps.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section id="local" title="Como chegar" icon={<MapPin />}>
            <div className="grid gap-5 md:grid-cols-[1fr_1.2fr]">
              <div className="space-y-3 text-[15px]">
                <p><strong className="block text-lg">{event.venue}</strong><span className="text-ink-600">{event.address}</span></p>
                <p className="text-ink-600">{event.city}, {event.province} — Angola</p>
                <ButtonLink href={event.mapUrl} target="_blank" rel="noopener noreferrer" variant="dark"><ExternalLink /> Abrir no Google Maps</ButtonLink>
              </div>
              <a href={event.mapUrl} target="_blank" rel="noopener noreferrer" className="relative block aspect-[16/9] overflow-hidden rounded-2xl bg-ink-100">
                <Image src={event.cover} alt={`Local: ${event.venue}`} fill sizes="(max-width: 768px) 100vw, 500px" className="object-cover" />
                <span className="absolute inset-0 flex items-center justify-center bg-ink-950/30">
                  <span className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-ink-900 shadow-lift"><MapPin className="size-4 text-brand-600" /> Ver no mapa</span>
                </span>
              </a>
            </div>
          </Section>

          {sponsors.length > 0 && (
            <section className="rounded-3xl border border-ink-200/70 bg-white p-6 shadow-card">
              <p className="mb-4 text-center text-xs font-bold tracking-widest text-ink-500 uppercase">Patrocinadores deste evento</p>
              <ul className="flex flex-wrap items-center justify-center gap-3">
                {sponsors.map((s) => (
                  <li key={s.id} className="flex h-16 w-40 items-center justify-center rounded-xl border border-ink-100 px-3">
                    <Image src={s.logo} alt={s.name} width={240} height={80} unoptimized className="h-auto w-full" />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        {/* Cartão lateral fixo (desktop) */}
        <aside className="hidden lg:block">
          <div className="sticky top-36 space-y-4 rounded-3xl border border-ink-200/70 bg-white p-6 shadow-card">
            {!finished && (
              <div>
                <p className="text-sm text-ink-500">Inscrição desde</p>
                <p className="text-3xl font-extrabold">{formatKz(minPrice(event, TODAY))}</p>
              </div>
            )}
            <ul className="space-y-2 text-[15px] text-ink-700">
              <li className="flex items-center gap-2"><CalendarDays className="size-4.5 text-ink-400" />{formatDateShort(event.date)} · {event.startTime}</li>
              <li className="flex items-center gap-2"><MapPin className="size-4.5 text-ink-400" />{event.city}, {event.province}</li>
              <li className="flex items-center gap-2"><Users className="size-4.5 text-ink-400" />{stats.total} inscritos</li>
            </ul>
            <CTA className="w-full" />
            <p className="flex items-center justify-center gap-1.5 text-xs text-ink-500"><ShieldCheck className="size-4 text-emerald-600" /> Vaga reservada enquanto paga</p>
          </div>
        </aside>
      </div>

      {/* Barra de inscrição fixa (telemóvel) — fica acima da barra de navegação */}
      {(open || finished) && (
        <div data-sticky-cta className="fixed inset-x-0 bottom-[68px] z-30 border-t border-ink-200 bg-white/95 p-3 backdrop-blur lg:hidden">
          <div className="flex items-center gap-3">
            {!finished && (
              <div className="shrink-0">
                <p className="text-xs text-ink-500">Desde</p>
                <p className="text-lg leading-tight font-extrabold">{formatKz(minPrice(event, TODAY))}</p>
              </div>
            )}
            <CTA className="h-12 flex-1" />
          </div>
        </div>
      )}
    </>
  );
}
