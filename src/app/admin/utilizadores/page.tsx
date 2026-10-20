import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { getAdminUsers, type UserFilters } from "@/server/queries/admin-lists";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata: Metadata = { title: "Utilizadores" };

export default async function Page({ searchParams }: { searchParams: Promise<UserFilters> }) {
  await requireAdminPage();
  return <UsersManager view={await getAdminUsers(await searchParams)} />;
}
