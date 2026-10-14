import { cn } from "@/lib/utils";
import type { EventStatus } from "@/lib/types";
import { EVENT_STATUS } from "@/lib/format";

const tones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/15",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/15",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/15",
  gray: "bg-ink-100 text-ink-600 ring-ink-500/15",
  brand: "bg-brand-50 text-brand-700 ring-brand-600/15",
  dark: "bg-ink-900/85 text-white ring-white/10 backdrop-blur",
} as const;

export type Tone = keyof typeof tones;

export function Badge({ tone = "gray", dot, className, children }: { tone?: Tone; dot?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {children}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: EventStatus; className?: string }) {
  const s = EVENT_STATUS[status];
  return (
    <Badge tone={s.tone} dot className={className}>
      {s.label}
    </Badge>
  );
}
