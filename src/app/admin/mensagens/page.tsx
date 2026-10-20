import type { Metadata } from "next";
import { Suspense } from "react";
import { ContactInbox } from "@/components/admin/contact-inbox";
import { requireAdminPage } from "@/server/auth";
import { listContactMessages, type InboxTab } from "@/server/queries/contact";

export const metadata: Metadata = { title: "Mensagens" };

const TABS: InboxTab[] = ["por-tratar", "organizar", "tratadas", "todas"];

export default async function MensagensPage({ searchParams }: { searchParams: Promise<{ estado?: string }> }) {
  await requireAdminPage();
  const sp = await searchParams;
  const tab = TABS.includes(sp.estado as InboxTab) ? (sp.estado as InboxTab) : "por-tratar";
  const { messages, counts } = await listContactMessages(tab);

  return (
    <Suspense>
      <ContactInbox messages={messages} counts={counts} tab={tab} />
    </Suspense>
  );
}
