import type { Metadata } from "next";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata: Metadata = { title: "Utilizadores" };

export default function Page() {
  return <UsersManager />;
}
