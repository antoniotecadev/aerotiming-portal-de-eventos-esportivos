import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, MessageCircleQuestion, MousePointerClick, Phone, Route, Ticket } from "lucide-react";
import { FaqBrowser } from "@/components/info/faq-browser";
import { WhatsAppIcon } from "@/components/layout/social-icons";
import { localPhone, telHref, whatsappHref } from "@/lib/site";
import { getSiteSettings } from "@/server/queries/site";
import { ButtonLink } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Ajuda",
  description: "Como me inscrevo? Como pago com Multicaixa? Onde levanto o kit? Respostas simples às perguntas mais frequentes.",
};

const GUIDE = [
  { Icon: MousePointerClick, title: "Escolha a prova", text: "Abra «Eventos» e toque na prova que quer fazer." },
  { Icon: Route, title: "Escolha a distância", text: "Toque em «Inscrever-me» e escolha, por exemplo, 5 km ou 10 km." },
  { Icon: CreditCard, title: "Pague", text: "Multicaixa Express, transferência, depósito ou KWiK — e envie o comprovativo pelo WhatsApp." },
  { Icon: Ticket, title: "Receba o bilhete", text: "Chega por SMS e fica na sua conta. Mostre-o no levantamento do kit." },
];

export default async function AjudaPage() {
  const settings = await getSiteSettings();
  const wa = whatsappHref(settings.whatsapp || settings.phone, `Olá! Preciso de ajuda com o site ${settings.siteName}.`);
  return (
    <>
      <PageHeader eyebrow="Centro de ajuda" title="Como podemos ajudar?" description="Respostas simples às dúvidas mais comuns. Se não encontrar o que procura, fale connosco." />

      {/* Guia rápido */}
      <section className="container-page -mt-6 relative z-10">
        <div className="rounded-3xl border border-ink-200/70 bg-white p-5 shadow-lift sm:p-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-bold tracking-wide text-brand-600 uppercase">Guia rápido</p>
              <h2 className="text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Como me inscrevo?</h2>
              <p className="mt-1 text-ink-600">São só 4 passos e demora cerca de 3 minutos.</p>
            </div>
            <ButtonLink href="/eventos" className="mt-2 sm:mt-0">
              <Ticket /> Ver eventos
            </ButtonLink>
          </div>
          <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {GUIDE.map(({ Icon, title, text }, i) => (
              <li key={title} className="relative rounded-2xl bg-ink-50 p-5">
                <span className="absolute top-4 right-4 font-display text-5xl leading-none font-extrabold text-ink-200" aria-hidden>
                  {i + 1}
                </span>
                <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-sm">
                  <Icon className="size-7" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink-900">
                  <span className="sr-only">Passo {i + 1}: </span>
                  {title}
                </h3>
                <p className="mt-1 text-[15px] text-ink-600">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Perguntas frequentes */}
      <section className="container-page py-12 lg:py-16">
        <h2 className="mb-6 flex items-center gap-2 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
          <MessageCircleQuestion className="size-7 text-brand-600" /> Perguntas frequentes
        </h2>
        <FaqBrowser />
      </section>

      {/* Ainda precisa de ajuda */}
      <section className="container-page pb-16">
        <div className="flex flex-col items-start gap-6 rounded-3xl bg-emerald-600 p-6 text-white sm:p-10 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-white/15">
              <WhatsAppIcon className="size-8" />
            </span>
            <div>
              <h2 className="text-2xl font-extrabold">Ainda tem dúvidas?</h2>
              <p className="mt-1 text-emerald-50">Fale connosco pelo WhatsApp. Respondemos de segunda a sábado, das 8h às 20h.</p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href={wa} target="_blank" rel="noopener noreferrer" variant="white" size="lg">
              <WhatsAppIcon /> Falar no WhatsApp
            </ButtonLink>
            <ButtonLink href={telHref(settings.phone)} variant="ghost" size="lg" className="text-white hover:bg-white/10 hover:text-white">
              <Phone /> Ligar {localPhone(settings.phone)}
            </ButtonLink>
          </div>
        </div>
        <p className="mt-4 text-center text-sm text-ink-500">
          Prefere escrever? Use o nosso{" "}
          <Link href="/contacto" className="font-semibold text-brand-700 hover:underline">
            formulário de contacto
          </Link>
          .
        </p>
      </section>
    </>
  );
}
