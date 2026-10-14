import Image from "next/image";
import type { Sponsor } from "@/lib/types";

const TIER_LABEL = { principal: "Patrocinadores principais", oficial: "Patrocinadores oficiais", apoio: "Apoio" } as const;

export function SponsorsStrip({ sponsors }: { sponsors: Sponsor[] }) {
  const tiers = (["principal", "oficial", "apoio"] as const).map((t) => ({ tier: t, items: sponsors.filter((s) => s.active && s.tier === t) })).filter((g) => g.items.length);
  return (
    <div className="space-y-8">
      {tiers.map(({ tier, items }) => (
        <div key={tier}>
          <p className="mb-4 text-center text-xs font-bold tracking-widest text-ink-500 uppercase">{TIER_LABEL[tier]}</p>
          <ul className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {items.map((s) => (
              <li key={s.id}>
                <a
                  href={s.url}
                  className={
                    tier === "principal"
                      ? "flex h-24 w-56 items-center justify-center rounded-2xl border border-ink-200/70 bg-white px-6 shadow-card transition hover:-translate-y-0.5 hover:shadow-lift"
                      : "flex h-18 w-40 items-center justify-center rounded-2xl border border-ink-200/70 bg-white px-4 opacity-80 grayscale transition hover:opacity-100 hover:grayscale-0"
                  }
                  aria-label={s.name}
                >
                  <Image src={s.logo} alt={s.name} width={240} height={80} unoptimized className="h-auto w-full" />
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
