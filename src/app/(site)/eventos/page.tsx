import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/ui/section-heading";
import { EventsExplorer } from "@/components/events/events-explorer";

export const metadata: Metadata = {
  title: "Eventos",
  description: "Todas as corridas, caminhadas, provas de ciclismo, BTT, trail e triatlo em Angola.",
};

export default function EventsPage() {
  return (
    <>
      <PageHeader eyebrow="Eventos" title="Encontre a sua próxima prova" description="Procure por nome, modalidade, província ou mês. Toque num evento para ver todos os detalhes e inscrever-se." />
      <Suspense fallback={<div className="container-page py-20 text-center text-ink-500">A carregar eventos…</div>}>
        <EventsExplorer />
      </Suspense>
    </>
  );
}
