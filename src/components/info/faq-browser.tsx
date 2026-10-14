"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FAQ, type FaqItem } from "./faq-data";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function Item({ item, defaultOpen }: { item: FaqItem; defaultOpen?: boolean }) {
  return (
    <details className="group rounded-2xl border border-ink-200/70 bg-white shadow-card open:ring-2 open:ring-brand-500/15" open={defaultOpen}>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[16px] font-semibold text-ink-900 select-none [&::-webkit-details-marker]:hidden">
        {item.q}
        <ChevronDown className="size-5 shrink-0 text-ink-500 transition-transform group-open:rotate-180" aria-hidden />
      </summary>
      <div className="space-y-3 px-5 pb-5 text-[15px] leading-relaxed text-ink-700">
        {item.a.map((p) => (
          <p key={p}>{p}</p>
        ))}
        {item.steps && (
          <ol className="space-y-2">
            {item.steps.map((s, i) => (
              <li key={s} className="flex gap-3">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                <span className="pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}

export function FaqBrowser() {
  const [q, setQ] = useState("");
  const query = norm(q.trim());

  const groups = useMemo(
    () =>
      FAQ.map((g) => ({
        ...g,
        items: query ? g.items.filter((i) => norm(`${i.q} ${i.a.join(" ")} ${(i.steps ?? []).join(" ")}`).includes(query)) : g.items,
      })).filter((g) => g.items.length > 0),
    [query],
  );
  const total = groups.reduce((acc, g) => acc + g.items.length, 0);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[220px_1fr]">
      <nav aria-label="Temas" className="hidden lg:block">
        <ul className="sticky top-28 space-y-1">
          {FAQ.map((g) => (
            <li key={g.id}>
              <a href={`#${g.id}`} className="block rounded-xl px-3 py-2.5 text-[15px] font-semibold text-ink-600 hover:bg-white hover:text-ink-900">
                {g.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-ink-400" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Escreva a sua dúvida. Ex.: referência, kit, dorsal…"
            aria-label="Procurar nas perguntas frequentes"
            className="h-14 w-full rounded-2xl border border-ink-200 bg-white pr-12 pl-12 text-[16px] text-ink-900 shadow-card placeholder:text-ink-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/15 focus:outline-none"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute top-1/2 right-3 -translate-y-1/2 rounded-lg p-2 text-ink-500 hover:bg-ink-100" aria-label="Limpar pesquisa">
              <X className="size-4" />
            </button>
          )}
        </div>
        {query && (
          <p className="mt-3 text-sm text-ink-600" aria-live="polite">
            {total === 0 ? "Não encontrámos nenhuma pergunta com essas palavras." : `${total} ${total === 1 ? "pergunta encontrada" : "perguntas encontradas"}`}
          </p>
        )}

        {/* Atalhos de temas no telemóvel */}
        {!query && (
          <div className="scrollbar-none -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:hidden">
            {FAQ.map((g) => (
              <a key={g.id} href={`#${g.id}`} className="inline-flex h-10 shrink-0 items-center rounded-full border border-ink-200 bg-white px-4 text-sm font-semibold text-ink-700">
                {g.title}
              </a>
            ))}
          </div>
        )}

        <div className="mt-8 space-y-10">
          {groups.map((g) => (
            <section key={g.id} id={g.id} className="scroll-mt-28">
              <h2 className="mb-4 text-xl font-extrabold text-ink-900">{g.title}</h2>
              <div className="space-y-3">
                {g.items.map((item, i) => (
                  <Item key={`${query}-${item.q}`} item={item} defaultOpen={!!query && i === 0 && total <= 3} />
                ))}
              </div>
            </section>
          ))}
        </div>
        {total === 0 && <div className={cn("mt-6 rounded-2xl border border-dashed border-ink-300 bg-white p-6 text-center text-ink-600")}>Tente outra palavra, ou fale connosco pelo WhatsApp — respondemos depressa.</div>}
      </div>
    </div>
  );
}
