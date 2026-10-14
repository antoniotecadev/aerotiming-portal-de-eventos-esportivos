import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react";
import { EVENTS, getEvent, isOpen } from "@/lib/data";
import { EVENT_STATUS } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RegistrationWizard } from "@/components/events/registration-wizard";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return EVENTS.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = getEvent((await params).slug);
  return e ? { title: `Inscrição · ${e.title}`, robots: { index: false } } : {};
}

export default async function RegistrationPage({ params }: Props) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();

  if (!isOpen(event)) {
    return (
      <div className="container-page max-w-2xl py-16">
        <EmptyState
          icon={<Lock />}
          title={`Inscrições indisponíveis — ${EVENT_STATUS[event.status].label}`}
          description="Não é possível inscrever-se neste evento neste momento. Veja outros eventos com inscrições abertas."
          action={
            <div className="flex flex-wrap justify-center gap-3">
              <ButtonLink href={`/eventos/${slug}`} variant="outline">Voltar ao evento</ButtonLink>
              <ButtonLink href="/eventos?estado=abertas">Ver eventos abertos</ButtonLink>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <Suspense>
      <RegistrationWizard event={event} />
    </Suspense>
  );
}
