import type { Metadata } from "next";
import { EventForm } from "@/components/admin/event-form";

export const metadata: Metadata = { title: "Criar evento" };

export default function Page() {
  return <EventForm />;
}
