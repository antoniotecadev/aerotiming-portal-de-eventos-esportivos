import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";
import { CheckInDesk } from "@/components/checkin/checkin-desk";
import { getCurrentUser } from "@/server/auth";
import { checkInEventsFor } from "@/server/permissions";
import { toDay } from "@/server/mappers";
import { today } from "@/lib/today";

export const metadata: Metadata = { title: "Check-in de kits", robots: { index: false, follow: false } };

/** Levantamento de kits (tarefa 7.6): admin, organizadores e staff dos eventos. */
export default async function CheckInPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/entrar?next=/checkin");
  // Inclui eventos de há 1 dia, para o check-in no próprio dia da prova
  const from = new Date(Date.now() - 86_400_000);
  const events = (await checkInEventsFor(user, today(from))).map((e) => ({ id: e.id, title: e.title, date: toDay(e.date), kitLocation: e.kitLocation }));

  return (
    <div className="min-h-dvh bg-ink-50">
      <header className="border-b border-ink-200/70 bg-white">
        <div className="mx-auto flex h-16 max-w-xl items-center justify-between px-4">
          <Logo />
          <span className="rounded-lg bg-ink-900 px-2.5 py-1 text-xs font-bold text-white uppercase">Check-in</span>
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 py-6">
        <h1 className="text-2xl font-extrabold tracking-tight">Levantamento de kits</h1>
        <p className="mt-1 mb-6 text-ink-600">Leia o QR do bilhete ou escreva o código. Confirme sempre o BI antes de entregar.</p>
        {events.length === 0 ? (
          <div className="rounded-3xl border border-ink-200/70 bg-white p-8 text-center shadow-card">
            <ShieldAlert className="mx-auto size-10 text-brand-600" />
            <p className="mt-3 font-bold">Não tem eventos para check-in</p>
            <p className="mt-1 text-ink-600">Peça ao organizador para o adicionar à equipa do evento.</p>
            <ButtonLink href="/" variant="outline" className="mt-5"><ArrowLeft /> Voltar ao site</ButtonLink>
          </div>
        ) : (
          <CheckInDesk events={events} />
        )}
      </main>
    </div>
  );
}
