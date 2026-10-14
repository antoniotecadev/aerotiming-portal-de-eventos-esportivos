import type { Metadata } from "next";
import { CategoriesManager } from "@/components/admin/categories-manager";

export const metadata: Metadata = { title: "Categorias" };

export default function Page() {
  return <CategoriesManager />;
}
