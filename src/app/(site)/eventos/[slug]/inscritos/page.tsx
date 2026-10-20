import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ticket } from "lucide-react";
import { isOpen } from "@/lib/event-utils";
import { getEventBySlug } from "@/server/queries/events";
import { listPublicParticipants } from "@/server/queries/registrations";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/ui/section-heading";
import { ButtonLink } from "@/components/ui/button";
import { ParticipantsTable } from "@/components/events/participants-table";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await getEventBySlug((await params).slug);
  return e ? { title: `Inscritos · ${e.title}` } : {};
}

export default async function ParticipantsPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  const participants = await listPublicParticipants(slug);

  return (
    <>
      <PageHeader eyebrow="Lista de inscritos" title={event.title} description={`${formatDate(event.date)} · ${event.venue}, ${event.city}. Procure o seu nome para confirmar a inscrição e o estado do pagamento.`}>
        <div className="flex flex-wrap gap-3">
          <Link href={`/eventos/${slug}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 font-semibold text-white hover:bg-white/20"><ArrowLeft className="size-4" /> Voltar ao evento</Link>
          {isOpen(event) && <ButtonLink href={`/eventos/${slug}/inscricao`}><Ticket /> Inscrever-me</ButtonLink>}
        </div>
      </PageHeader>
      <div className="container-page py-8 pb-28 lg:pb-12">
        <ParticipantsTable participants={participants} distances={event.distances} />
      </div>
    </>
  );
}
