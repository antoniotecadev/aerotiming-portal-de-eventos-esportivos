import type { Metadata } from "next";
import Image from "next/image";
import {
  BarChart3,
  CalendarCheck2,
  CheckCircle2,
  CreditCard,
  Flag,
  HandHeart,
  Mail,
  MapPinned,
  Megaphone,
  Phone,
  ScanLine,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  Trophy,
  Users,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader, SectionHeading } from "@/components/ui/section-heading";
import { WHATSAPP_NUMBER, WhatsAppIcon } from "@/components/layout/social-icons";

export const metadata: Metadata = {
  title: "Sobre nós",
  description: "A AeroTiming faz cronometragem electrónica e inscrições online para corridas, ciclismo, trail e caminhadas em Angola.",
};

const NUMBERS = [
  { value: "180+", label: "eventos cronometrados", Icon: Timer },
  { value: "65 000", label: "atletas inscritos", Icon: Users },
  { value: "14", label: "províncias com provas", Icon: MapPinned },
  { value: "99,8%", label: "tempos registados com sucesso", Icon: BarChart3 },
];

const STEPS = [
  {
    Icon: ScanLine,
    title: "1. Recebe um dorsal com chip",
    text: "No levantamento do kit recebe o dorsal com um pequeno chip colado atrás. Não precisa de fazer nada: basta prendê-lo à camisola, na frente.",
  },
  {
    Icon: Flag,
    title: "2. Passa pelos tapetes",
    text: "Na partida, em pontos do percurso e na chegada há tapetes com antenas. Quando passa por cima, o seu tempo é registado ao segundo.",
  },
  {
    Icon: Smartphone,
    title: "3. Vê o resultado no telemóvel",
    text: "Minutos depois de cortar a meta, o seu tempo, ritmo e posição aparecem no site. Também recebe um SMS com o resultado.",
  },
];

const VALUES = [
  { Icon: ShieldCheck, title: "Rigor", text: "Tempos exactos e classificações justas, verificadas antes de serem publicadas." },
  { Icon: HandHeart, title: "Simplicidade", text: "Tudo pensado para ser fácil, mesmo para quem nunca se inscreveu numa prova online." },
  { Icon: Users, title: "Proximidade", text: "Estamos no terreno, em todas as provas, e respondemos por WhatsApp, telefone ou e-mail." },
  { Icon: Sparkles, title: "Paixão pelo desporto", text: "Somos atletas e queremos ver mais angolanos a correr, pedalar e caminhar." },
];

const BENEFITS = [
  { Icon: CreditCard, title: "Inscrições e pagamentos online", text: "Multicaixa Express, referência e transferência, com confirmação automática por SMS." },
  { Icon: Timer, title: "Cronometragem electrónica", text: "Chips, tapetes, relógios de meta e equipa técnica no dia da prova." },
  { Icon: Trophy, title: "Resultados em tempo real", text: "Classificações por sexo e escalão publicadas em minutos, com diplomas digitais." },
  { Icon: Megaphone, title: "Divulgação do evento", text: "Página do evento no nosso calendário, destaque na página inicial e nas redes sociais." },
  { Icon: CalendarCheck2, title: "Gestão de kits e dorsais", text: "Listas de atletas, levantamento do kit com código QR e relatórios em tempo real." },
  { Icon: BarChart3, title: "Relatórios para patrocinadores", text: "Números de participação, perfil dos atletas e visibilidade das marcas." },
];

export default function SobrePage() {
  return (
    <>
      <PageHeader
        eyebrow="Sobre nós"
        title="Cronometramos as provas de Angola"
        description="Desde 2019 ajudamos organizadores a fazer eventos desportivos melhores e atletas a inscrever-se em minutos e a ver os seus tempos logo após a prova."
      />

      {/* Quem somos */}
      <section className="container-page grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-20">
        <div>
          <SectionHeading eyebrow="Quem somos" title="Uma equipa angolana ao serviço do desporto" />
          <div className="mt-5 space-y-4 text-[17px] leading-relaxed text-ink-700">
            <p>
              A AeroTiming nasceu em Luanda, criada por atletas e engenheiros que queriam acabar com as filas para inscrições, os papéis perdidos e os resultados que
              demoravam semanas a sair.
            </p>
            <p>
              Hoje somos a plataforma onde milhares de pessoas encontram corridas, caminhadas, provas de ciclismo, BTT, trail e triatlo em todo o país — e onde os
              organizadores gerem tudo num só lugar.
            </p>
          </div>
          <div className="mt-6 rounded-2xl border-l-4 border-brand-600 bg-brand-50 p-5">
            <p className="text-sm font-bold tracking-wide text-brand-700 uppercase">A nossa missão</p>
            <p className="mt-1 text-lg font-semibold text-ink-900">Pôr Angola a mexer, tornando cada prova simples para quem participa e profissional para quem organiza.</p>
          </div>
        </div>
        <div className="relative aspect-[4/3] overflow-hidden rounded-3xl bg-ink-100 shadow-lift">
          <Image src="/images/eventos/maratona.jpg" alt="Atletas na partida de uma maratona em Luanda" fill sizes="(min-width: 1024px) 50vw, 100vw" className="object-cover" />
        </div>
      </section>

      {/* Números */}
      <section className="bg-white py-12">
        <div className="container-page">
          <ul className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {NUMBERS.map(({ value, label, Icon }) => (
              <li key={label} className="rounded-2xl bg-ink-50 p-5 text-center sm:p-6">
                <Icon className="mx-auto size-7 text-brand-600" />
                <p className="mt-2 font-display text-4xl font-extrabold text-ink-900 tabular sm:text-5xl">{value}</p>
                <p className="mt-1 text-[15px] text-ink-600">{label}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Como funciona a cronometragem */}
      <section className="container-page py-14 lg:py-20">
        <SectionHeading
          eyebrow="Cronometragem electrónica"
          title="Como é medido o seu tempo?"
          description="É simples e automático. Só tem de correr (ou pedalar, ou caminhar)!"
        />
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map(({ Icon, title, text }) => (
            <li key={title}>
              <Card className="h-full p-6">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-ink-900 text-sun-400">
                  <Icon className="size-7" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-900">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-ink-600">{text}</p>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-6 rounded-2xl bg-sky-50 px-5 py-4 text-[15px] text-sky-900 ring-1 ring-sky-200">
          <strong>Tempo de chip vs. tempo oficial:</strong> o tempo oficial conta desde o tiro de partida; o tempo de chip conta desde que <em>você</em> passa o tapete
          da partida. Mostramos os dois nos resultados.
        </p>
      </section>

      {/* Valores */}
      <section className="bg-ink-900 py-14 text-white lg:py-20">
        <div className="container-page">
          <SectionHeading invert eyebrow="Os nossos valores" title="O que nos move" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ Icon, title, text }) => (
              <div key={title} className="rounded-2xl bg-white/5 p-6 ring-1 ring-white/10">
                <Icon className="size-7 text-sun-400" />
                <h3 className="mt-3 text-lg font-bold">{title}</h3>
                <p className="mt-1.5 text-[15px] text-ink-300">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Organizadores */}
      <section id="organizadores" className="container-page scroll-mt-24 py-14 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <SectionHeading
              eyebrow="Para organizadores"
              title="Organize o seu evento connosco"
              description="Corrida de empresa, prova solidária, maratona internacional ou passeio de BTT: tratamos das inscrições, dos pagamentos, da cronometragem e dos resultados."
            />
            <div className="relative mt-6 hidden aspect-[4/3] overflow-hidden rounded-3xl bg-ink-100 lg:block">
              <Image src="/images/eventos/ciclismo.jpg" alt="Ciclistas numa prova de estrada" fill sizes="40vw" className="object-cover" />
            </div>
          </div>
          <div className="lg:col-span-3">
            <ul className="grid gap-4 sm:grid-cols-2">
              {BENEFITS.map(({ Icon, title, text }) => (
                <li key={title} className="flex gap-4 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h3 className="font-bold text-ink-900">{title}</h3>
                    <p className="mt-1 text-[15px] text-ink-600">{text}</p>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-6 rounded-3xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white sm:p-8">
              <h3 className="text-2xl font-extrabold">Vamos falar sobre o seu evento?</h3>
              <ul className="mt-3 space-y-1.5 text-brand-50">
                {["Orçamento gratuito em 48 horas", "Sem compromisso", "Acompanhamento do início ao fim"].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="size-5 text-sun-300" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <ButtonLink href="/contacto?assunto=organizar" variant="white" size="lg">
                  <Mail /> Pedir orçamento
                </ButtonLink>
                <ButtonLink
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Olá! Quero organizar um evento com a AeroTiming.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="dark"
                  size="lg"
                >
                  <WhatsAppIcon /> Falar no WhatsApp
                </ButtonLink>
                <ButtonLink href="tel:+244923000000" variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">
                  <Phone /> 923 000 000
                </ButtonLink>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
