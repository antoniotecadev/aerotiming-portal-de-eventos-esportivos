"use client";

import { AuthProvider } from "./auth/auth-provider";
import { ToastProvider } from "./ui/toast";
import type { User } from "@/lib/types";

export function Providers({ user, children }: { user: User | null; children: React.ReactNode }) {
  return (
    <AuthProvider initialUser={user}>
      <ToastProvider>{children}</ToastProvider>
    </AuthProvider>
  );
}
