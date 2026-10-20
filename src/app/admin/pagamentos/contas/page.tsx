import type { Metadata } from "next";
import { PaymentAccountsEditor } from "@/components/admin/payment-accounts-editor";
import { requireUser } from "@/server/auth";
import { getSitePaymentAccounts, listManagedEvents } from "@/server/queries/payments";

export const metadata: Metadata = { title: "Contas e WhatsApp" };

export default async function ContasPage() {
  const user = await requireUser("/admin/pagamentos/contas");
  const [events, site] = await Promise.all([listManagedEvents(user), getSitePaymentAccounts()]);
  return <PaymentAccountsEditor isAdmin={user.role === "admin"} site={site} events={events.map((e) => ({ id: e.id, title: e.title, accounts: e.accounts }))} />;
}
