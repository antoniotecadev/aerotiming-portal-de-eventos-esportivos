import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/section-heading";
import { EventsExplorer } from "@/components/events/events-explorer";
import { listPublicEvents } from "@/server/queries/events";
import { listCategories } from "@/server/queries/catalog";
import { today } from "@/lib/today";

export const metadata: Metadata = {
  title: "Eventos",
  description: "Todas as corridas, caminhadas, provas de ciclismo, BTT, trail e triatlo em Angola.",
  alternates: { canonical: "/eventos" },
};

export default async function EventsPage() {
  const [events, categories] = await Promise.all([listPublicEvents(), listCategories()]);
  return (
    <>
      <PageHeader eyebrow="Eventos" title="Encontre a sua próxima prova" description="Procure por nome, modalidade, província ou mês. Toque num evento para ver todos os detalhes e inscrever-se." />
      <Suspense fallback={<div className="container-page py-20 text-center text-ink-500">A carregar eventos…</div>}>
        <EventsExplorer events={events} categories={categories} today={today()} />
      </Suspense>
    </>
  );
}
