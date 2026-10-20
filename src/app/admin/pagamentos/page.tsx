import type { Metadata } from "next";
import { Suspense } from "react";
import { PaymentsPanel } from "@/components/admin/payments-panel";
import { requireUser } from "@/server/auth";
import { listManagedEvents, listPanelPayments, type PanelTab } from "@/server/queries/payments";

export const metadata: Metadata = { title: "Pagamentos" };

const TABS: PanelTab[] = ["por-confirmar", "rejeitados", "confirmados", "todos"];

export default async function PagamentosPage({ searchParams }: { searchParams: Promise<{ evento?: string; estado?: string; q?: string }> }) {
  const user = await requireUser("/admin/pagamentos");
  const sp = await searchParams;
  const events = await listManagedEvents(user);
  const allowed = events.map((e) => e.id);
  const eventId = sp.evento && allowed.includes(sp.evento) ? sp.evento : "";
  const tab = TABS.includes(sp.estado as PanelTab) ? (sp.estado as PanelTab) : "por-confirmar";
  const { rows, counts } = await listPanelPayments({ eventIds: eventId ? [eventId] : allowed, tab, q: sp.q });

  return (
    <Suspense>
      <PaymentsPanel events={events} rows={rows} counts={counts} tab={tab} eventId={eventId} q={sp.q ?? ""} />
    </Suspense>
  );
}
