import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { LogIn, Lock, Ticket, UserPlus } from "lucide-react";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/server/auth";
import { isOpen } from "@/lib/event-utils";
import { today } from "@/lib/today";
import { getEventBySlug } from "@/server/queries/events";
import { EVENT_STATUS } from "@/lib/format";
import { ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { RegistrationWizard } from "@/components/events/registration-wizard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const e = await getEventBySlug((await params).slug);
  return e ? { title: `Inscrição · ${e.title}`, robots: { index: false } } : {};
}

export default async function RegistrationPage({ params }: Props) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
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

  // Inscrição exige conta (D6): sem sessão, mostra um ecrã simples e volta aqui depois.
  const user = await getCurrentUser();
  const back = encodeURIComponent(`/eventos/${slug}/inscricao`);
  if (!user) {
    return (
      <div className="container-page max-w-xl py-14 pb-28 lg:pb-16">
        <div className="rounded-3xl border border-ink-200/70 bg-white p-6 text-center shadow-card sm:p-10">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <Ticket className="size-8" />
          </span>
          <h1 className="mt-5 text-2xl font-extrabold tracking-tight sm:text-3xl">Para se inscrever precisa de uma conta</h1>
          <p className="mt-2 text-ink-600">
            Assim guardamos a sua inscrição, o bilhete e os resultados num só lugar. Criar conta é grátis e demora menos de 1 minuto.
          </p>
          <div className="mt-8 flex flex-col gap-3">
            <ButtonLink href={`/criar-conta?next=${back}`} size="lg"><UserPlus /> Criar conta grátis</ButtonLink>
            <ButtonLink href={`/entrar?next=${back}`} variant="outline" size="lg"><LogIn /> Já tenho conta — entrar</ButtonLink>
          </div>
          <p className="mt-6 text-sm text-ink-500">Depois de entrar, voltamos logo a esta inscrição: {event.title}.</p>
        </div>
      </div>
    );
  }

  // Já tem uma inscrição activa neste evento?
  const existing = await prisma.registration.findFirst({
    where: { userId: user.id, event: { slug }, status: { in: ["pagamento_pendente", "confirmada"] } },
    select: { code: true, athleteName: true },
  });

  return (
    <>
      {existing && (
        <div className="container-page pt-6">
          <div className="flex flex-col gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[15px]">
              Já tem uma inscrição neste evento (<strong>{existing.code}</strong> — {existing.athleteName}). Pode continuar para inscrever outra pessoa.
            </p>
            <ButtonLink href="/perfil/inscricoes" variant="white" size="sm">Ver as minhas inscrições</ButtonLink>
          </div>
        </div>
      )}
      <Suspense>
        <RegistrationWizard event={event} today={today()} />
      </Suspense>
    </>
  );
}
