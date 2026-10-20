import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/dashboard";
import { LaunchChecklist } from "@/components/admin/launch-checklist";
import { requireUser } from "@/server/auth";
import { getDashboardStats } from "@/server/queries/admin-lists";

export const metadata: Metadata = { title: "Painel" };

export default async function Page() {
  const user = await requireUser("/admin");
  return (
    <>
      <LaunchChecklist />
      <Dashboard stats={await getDashboardStats(user)} />
    </>
  );
}
