import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function EntrarPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-ink-100" aria-hidden />}>
      <LoginForm />
    </Suspense>
  );
}
