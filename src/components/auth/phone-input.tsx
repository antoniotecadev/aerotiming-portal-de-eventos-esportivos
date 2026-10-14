"use client";

import { cn } from "@/lib/utils";

/** Formata 9 dígitos como "923 481 902". */
export function formatLocalPhone(value: string) {
  const d = value.replace(/\D/g, "").slice(0, 9);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6, 9)].filter(Boolean).join(" ");
}

/** Remove o indicativo +244 de um número guardado. */
export function stripPrefix(phone: string) {
  const d = phone.replace(/\D/g, "");
  return formatLocalPhone(d.startsWith("244") && d.length > 9 ? d.slice(3) : d);
}

export const isValidAoPhone = (value: string) => /^9\d{8}$/.test(value.replace(/\D/g, ""));

/** Campo de telemóvel com o indicativo +244 fixo à esquerda. */
export function PhoneInput({
  value,
  onChange,
  className,
  ...props
}: { value: string; onChange: (v: string) => void } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <div
      className={cn(
        "flex h-12 w-full items-center overflow-hidden rounded-xl border border-ink-200 bg-white transition-colors hover:border-ink-300 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-500/15 has-[[aria-invalid=true]]:border-red-500",
        className,
      )}
    >
      <span className="flex h-full items-center gap-1.5 border-r border-ink-200 bg-ink-50 px-3 text-[15px] font-semibold text-ink-700 select-none">
        <span aria-hidden>🇦🇴</span> +244
      </span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        placeholder="923 000 000"
        className="h-full min-w-0 flex-1 bg-transparent px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 focus:outline-none"
        value={value}
        onChange={(e) => onChange(formatLocalPhone(e.target.value))}
        {...props}
      />
    </div>
  );
}
