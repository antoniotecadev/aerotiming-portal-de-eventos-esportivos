import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

/** Símbolo (o atleta a correr) — o mesmo ícone dos favicons. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <div className={cn("relative size-9", className)}>
      <Image src="/favicon/android-chrome-192x192.png" alt="" fill sizes="40px" priority className="object-contain" />
    </div>
  );
}

/** Símbolo + nome, como no logotipo original (public/logotipo-conexaosport.png): "Conexão" escuro, "Sport" laranja, em itálico. */
export function Logo({ invert, className }: { invert?: boolean; className?: string }) {
  return (
    <Link href="/" className={cn("inline-flex items-center gap-2", className)} aria-label="ConexãoSport — página inicial">
      <LogoMark />
      <span className={cn("font-display text-[27px] leading-none font-extrabold tracking-tight italic", invert ? "text-white" : "text-ink-900")}>
        Conexão<span className="text-brand-600">Sport</span>
      </span>
    </Link>
  );
}
