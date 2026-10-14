"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Campo de palavra-passe com botão "Mostrar / Esconder". */
export function PasswordInput({ className, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} className={cn("pr-28", className)} {...props} />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="absolute top-1/2 right-1.5 inline-flex h-9 -translate-y-1/2 items-center gap-1.5 rounded-lg px-2.5 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900"
        aria-label={show ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
        aria-pressed={show}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        {show ? "Esconder" : "Mostrar"}
      </button>
    </div>
  );
}

/** Avalia a força da palavra-passe (0–4) com mensagens simples. */
export function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  else if (/\d/.test(pw) && pw.length >= 8) score = Math.max(score, 2);
  const levels = [
    { label: "Muito fraca", hint: "Use pelo menos 6 caracteres.", color: "bg-red-500" },
    { label: "Fraca", hint: "Junte números e letras maiúsculas para ficar mais segura.", color: "bg-orange-500" },
    { label: "Razoável", hint: "Está bem. Pode juntar um símbolo (ex.: ! ou #).", color: "bg-amber-400" },
    { label: "Forte", hint: "Boa palavra-passe!", color: "bg-emerald-500" },
    { label: "Muito forte", hint: "Excelente palavra-passe!", color: "bg-emerald-600" },
  ];
  return { score, ...levels[score] };
}

export function PasswordStrength({ value }: { value: string }) {
  if (!value) return <p className="text-sm text-ink-500">Mínimo 6 caracteres. Dica: misture letras e números.</p>;
  const s = passwordStrength(value);
  return (
    <div className="space-y-1.5" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn("h-1.5 flex-1 rounded-full", i < Math.max(1, s.score) ? s.color : "bg-ink-200")} />
        ))}
      </div>
      <p className="text-sm text-ink-600">
        <span className="font-semibold text-ink-800">{s.label}.</span> {s.hint}
      </p>
    </div>
  );
}

/** Mostra um erro geral do formulário. */
export function FormError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700">
      {children}
    </div>
  );
}
