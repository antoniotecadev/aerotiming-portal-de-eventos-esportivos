import type { Metadata } from "next";
import { EVENTS, TODAY } from "@/lib/data";
import { PageHeader } from "@/components/ui/section-heading";
import { EventCalendar } from "@/components/calendar/event-calendar";

export const metadata: Metadata = {
  title: "Calendário de eventos",
  description: "Veja todas as corridas, caminhadas, provas de ciclismo, trail e triatlo em Angola, mês a mês.",
};

export default function CalendarPage() {
  const events = EVENTS.filter((e) => e.status !== "cancelado");
  return (
    <>
      <PageHeader
        eyebrow="Calendário"
        title="Calendário de eventos"
        description="Escolha um mês e toque num dia para ver as provas. Também pode ver tudo em lista."
      />
      <div className="container-page py-8 sm:py-10">
        <EventCalendar events={events} today={TODAY} />
      </div>
    </>
  );
}
