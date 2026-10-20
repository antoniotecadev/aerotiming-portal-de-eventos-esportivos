import Link from "next/link";
import { FileText } from "lucide-react";
import { PageHeader } from "@/components/ui/section-heading";

export interface LegalSection {
  id: string;
  title: string;
  body: (string | string[])[]; // string = parágrafo, string[] = lista
}

/** Página de texto legal legível: índice à esquerda e secções numeradas. */
export function LegalPage({ title, description, updated, summary, sections }: { title: string; description: string; updated: string; summary: string[]; sections: LegalSection[] }) {
  return (
    <>
      <PageHeader eyebrow="Informação legal" title={title} description={description} />
      <div className="container-page grid gap-10 py-10 lg:grid-cols-[240px_1fr] lg:py-14">
        <nav aria-label="Índice" className="hidden lg:block">
          <div className="sticky top-28">
            <p className="mb-2 text-sm font-bold tracking-wide text-ink-500 uppercase">Nesta página</p>
            <ol className="space-y-1">
              {sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-lg px-3 py-2 text-sm text-ink-600 hover:bg-white hover:text-ink-900">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </div>
        </nav>

        <article className="max-w-3xl">
          <p className="text-sm text-ink-500">Última actualização: {updated}</p>

          <div className="mt-4 rounded-2xl bg-brand-50 p-5 ring-1 ring-brand-100">
            <p className="flex items-center gap-2 font-bold text-ink-900">
              <FileText className="size-5 text-brand-600" /> Resumo em linguagem simples
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-ink-700">
              {summary.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>

          <div className="mt-8 space-y-10">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <h2 className="text-xl font-extrabold text-ink-900">
                  {i + 1}. {s.title}
                </h2>
                <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-ink-700">
                  {s.body.map((b, j) =>
                    Array.isArray(b) ? (
                      <ul key={j} className="list-disc space-y-1.5 pl-5">
                        {b.map((li) => (
                          <li key={li}>{li}</li>
                        ))}
                      </ul>
                    ) : (
                      <p key={j}>{b}</p>
                    ),
                  )}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-12 rounded-2xl border border-ink-200 bg-white p-5 text-[15px] text-ink-600">
            Tem dúvidas sobre este documento?{" "}
            <Link href="/contacto" className="font-semibold text-brand-700 hover:underline">
              Fale connosco
            </Link>{" "}
            ou escreva para <a href="mailto:privacidade@conexaosport.ao" className="font-semibold text-brand-700 hover:underline">privacidade@conexaosport.ao</a>.
          </p>
        </article>
      </div>
    </>
  );
}
