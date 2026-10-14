import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("size-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" className="fill-brand-600" />
      <path d="M11 29 L20 10 L29 29" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.5 22 H25.5" stroke="#ffc21a" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ invert, className }: { invert?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="AeroTiming — página inicial">
      <LogoMark />
      <span className={cn("font-display text-[26px] leading-none font-extrabold tracking-tight uppercase", invert ? "text-white" : "text-ink-900")}>
        Aero<span className="text-brand-600">Timing</span>
      </span>
    </Link>
  );
}
