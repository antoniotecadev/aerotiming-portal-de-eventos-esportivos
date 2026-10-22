import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/layout/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh bg-white">
      {/* Formulário */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 px-4 py-5 sm:px-8">
          <Logo />
          <Link href="/" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-600 hover:bg-ink-100 hover:text-ink-900">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Voltar ao site</span>
            <span className="sm:hidden">Início</span>
          </Link>
        </header>
        <main id="conteudo" className="flex flex-1 justify-center px-4 pt-4 pb-12 sm:px-8 sm:pt-8">
          <div className="w-full max-w-md">{children}</div>
        </main>
        <footer className="px-4 pb-6 text-center text-sm text-ink-500 sm:px-8">
          Precisa de ajuda?{" "}
          <Link href="/ajuda" className="font-semibold text-brand-700 hover:underline">
            Veja as perguntas frequentes
          </Link>
        </footer>
      </div>

      {/* Painel de imagem (só em ecrãs grandes) */}
      <aside className="relative hidden w-[46%] max-w-3xl overflow-hidden bg-ink-900 lg:block">
        <Image src="/images/eventos/maratona-noite.jpg" alt="" fill priority sizes="46vw" className="object-cover opacity-80" />
        <div className="absolute inset-0 bg-linear-to-t from-ink-950 via-ink-950/50 to-ink-950/10" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-10 text-white xl:p-14">
          <p className="text-sm font-bold tracking-wide text-brand-400 uppercase">Cada quilómetro conta</p>
          <h2 className="mt-2 font-display text-5xl leading-[0.95] font-extrabold uppercase xl:text-6xl">
            A sua próxima meta
            <br />
            começa aqui.
          </h2>
          <ul className="mt-6 space-y-2.5 text-[15px] text-ink-100">
            {["Inscreva-se em minutos e pague com Multicaixa", "Receba o bilhete e o dorsal no telemóvel", "Veja os seus tempos logo após a prova"].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <CheckCircle2 className="size-5 shrink-0 text-brand-400" />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
