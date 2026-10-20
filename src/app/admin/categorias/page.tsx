import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth";
import { CategoriesManager } from "@/components/admin/categories-manager";

export const metadata: Metadata = { title: "Categorias" };

export default async function Page() {
  await requireAdminPage();
  return <CategoriesManager />;
}
