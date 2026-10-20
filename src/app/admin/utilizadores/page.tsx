import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata: Metadata = { title: "Utilizadores" };

export default async function Page() {
  await requireAdminPage();
  return <UsersManager />;
}
