import type { Metadata } from "next";
import { EventsList } from "@/components/admin/events-list";

export const metadata: Metadata = { title: "Eventos" };

export default function Page() {
  return <EventsList />;
}
