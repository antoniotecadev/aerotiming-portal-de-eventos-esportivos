import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, Home, Search } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Página não encontrada" };

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col bg-ink-50">
      <header className="container-page py-5">
        <Logo />
      </header>
      <main id="conteudo" className="container-page flex flex-1 flex-col items-center justify-center py-12 text-center">
        <p className="font-display text-[120px] leading-none font-extrabold text-ink-900 sm:text-[160px]">
          4<span className="text-brand-600">0</span>4
        </p>
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">Ups! Saímos do percurso.</h1>
        <p className="mt-3 max-w-md text-[17px] text-ink-600">
          A página que procura não existe ou mudou de endereço. Não se preocupe — volte ao início ou veja as próximas provas.
        </p>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3 sm:max-w-none sm:flex-row sm:justify-center">
          <ButtonLink href="/" size="lg">
            <Home /> Voltar ao início
          </ButtonLink>
          <ButtonLink href="/eventos" size="lg" variant="outline">
            <CalendarDays /> Ver eventos
          </ButtonLink>
        </div>
        <p className="mt-8 flex items-center gap-2 text-sm text-ink-500">
          <Search className="size-4" /> Procura os seus resultados?{" "}
          <Link href="/resultados" className="font-semibold text-brand-700 hover:underline">
            Ver resultados
          </Link>
        </p>
      </main>
    </div>
  );
}
