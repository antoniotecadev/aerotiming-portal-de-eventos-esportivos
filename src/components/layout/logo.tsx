import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative size-9", className)}>
      <Image
        src="/logotipo-conexaosport.png"
        alt="Logotipo Conexão Sport"
        fill
        sizes="(max-width: 768px) 36px, 36px"
        priority
        className="object-contain"
      />
    </div>
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
