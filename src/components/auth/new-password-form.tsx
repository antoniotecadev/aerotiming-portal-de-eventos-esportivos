"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { FormError, PasswordInput, PasswordStrength } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updatePassword } from "@/server/actions/auth";

/** Passo 2 da recuperação: o link do e-mail já iniciou sessão; aqui escolhe-se a nova palavra-passe. */
export function NewPasswordForm() {
  const router = useRouter();
  const toast = useToast();
  const { refresh } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (password !== confirm) return setError("As duas palavras-passe não são iguais.");
    startTransition(async () => {
      const res = await updatePassword({ password });
      if (!res.ok) return setError(res.error);
      toast({ title: "Palavra-passe alterada", description: "Já está a usar a nova palavra-passe." });
      router.push(res.redirectTo ?? "/perfil");
      refresh();
    });
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold tracking-tight text-ink-900">Nova palavra-passe</h1>
      <p className="mt-2 text-ink-600">Escolha uma palavra-passe que seja fácil de lembrar para si, mas difícil de adivinhar.</p>
      <form
        className="mt-8 space-y-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <FormError>{error}</FormError>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-semibold text-ink-800">Nova palavra-passe</label>
          <PasswordInput id="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <PasswordStrength value={password} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="confirm" className="block text-sm font-semibold text-ink-800">Repita a palavra-passe</label>
          <PasswordInput id="confirm" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          <KeyRound /> {pending ? "A guardar…" : "Guardar nova palavra-passe"}
        </Button>
      </form>
    </div>
  );
}
