import type { Metadata } from "next";
import { Suspense } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/components/info/contact-form";
import { WHATSAPP_NUMBER, WhatsAppIcon } from "@/components/layout/social-icons";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/section-heading";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Fale com a AeroTiming por WhatsApp, telefone, e-mail ou visite-nos em Luanda.",
};

const CHANNELS = [
  {
    Icon: WhatsAppIcon,
    title: "WhatsApp",
    value: "+244 923 000 000",
    hint: "A forma mais rápida",
    href: `https://wa.me/${WHATSAPP_NUMBER}`,
    tone: "bg-emerald-50 text-emerald-600",
    external: true,
  },
  { Icon: Phone, title: "Telefone", value: "+244 923 000 000", hint: "Seg. a sex., 8h–18h", href: "tel:+244923000000", tone: "bg-brand-50 text-brand-600" },
  { Icon: Mail, title: "E-mail", value: "geral@aerotiming.ao", hint: "Resposta em 1 dia útil", href: "mailto:geral@aerotiming.ao", tone: "bg-sky-50 text-sky-600" },
  {
    Icon: MapPin,
    title: "Escritório",
    value: "Rua Major Kanhangulo, 120",
    hint: "Ingombota, Luanda",
    href: "https://maps.google.com/?q=Rua+Major+Kanhangulo+Luanda",
    tone: "bg-violet-50 text-violet-600",
    external: true,
  },
];

const HOURS = [
  { day: "Segunda a sexta", time: "08:00 – 18:00" },
  { day: "Sábado", time: "09:00 – 13:00" },
  { day: "Domingo e feriados", time: "Fechado*" },
];

export default function ContactoPage() {
  return (
    <>
      <PageHeader eyebrow="Contacto" title="Fale connosco" description="Estamos aqui para ajudar atletas, organizadores e patrocinadores. Escolha a forma que preferir." />

      <section className="container-page py-10 lg:py-14">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CHANNELS.map(({ Icon, title, value, hint, href, tone, external }) => (
            <li key={title}>
              <a
                href={href}
                {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="flex h-full items-center gap-4 rounded-2xl border border-ink-200/70 bg-white p-5 shadow-card transition-shadow hover:shadow-lift"
              >
                <span className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${tone}`}>
                  <Icon className="size-6" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-500">{title}</span>
                  <span className="block truncate font-bold text-ink-900">{value}</span>
                  <span className="block text-sm text-ink-500">{hint}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Envie-nos uma mensagem" description="Preencha o formulário e respondemos o mais depressa possível." />
            <div className="p-5 sm:p-6">
              <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-ink-100" aria-hidden />}>
                <ContactForm />
              </Suspense>
            </div>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader title={<span className="inline-flex items-center gap-2"><Clock className="size-5 text-brand-600" /> Horário de atendimento</span>} />
              <ul className="divide-y divide-ink-100">
                {HOURS.map((h) => (
                  <li key={h.day} className="flex items-center justify-between gap-4 px-5 py-3.5 text-[15px] sm:px-6">
                    <span className="text-ink-700">{h.day}</span>
                    <span className="font-semibold text-ink-900 tabular">{h.time}</span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-ink-100 px-5 py-3.5 text-sm text-ink-500 sm:px-6">
                * Nos dias de prova a nossa equipa está no local do evento e o WhatsApp funciona a partir das 5h00.
              </p>
            </Card>
            <Card className="overflow-hidden">
              <iframe
                title="Mapa do escritório AeroTiming em Luanda"
                src="https://www.openstreetmap.org/export/embed.html?bbox=13.226%2C-8.822%2C13.242%2C-8.810&layer=mapnik&marker=-8.816%2C13.234"
                className="h-56 w-full border-0"
                loading="lazy"
              />
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
