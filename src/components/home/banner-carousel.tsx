"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { ArrowRight, ChevronLeft, ChevronRight, Megaphone, Camera, CalendarDays } from "lucide-react";
import type { Banner } from "@/lib/types";
import { cn } from "@/lib/utils";

const KIND = {
  evento: { label: "Próximo evento", Icon: CalendarDays },
  publicidade: { label: "Publicidade", Icon: Megaphone },
  memoria: { label: "Edições anteriores", Icon: Camera },
} as const;

export function BannerCarousel({ banners }: { banners: Banner[] }) {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true }, [Autoplay({ delay: 6000, stopOnInteraction: false, stopOnMouseEnter: true })]);
  const [index, setIndex] = useState(0);

  const onSelect = useCallback(() => embla && setIndex(embla.selectedScrollSnap()), [embla]);
  useEffect(() => {
    if (!embla) return;
    onSelect();
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla, onSelect]);

  return (
    <div className="relative" aria-roledescription="carrossel" aria-label="Destaques">
      <div className="overflow-hidden rounded-3xl" ref={emblaRef}>
        <div className="flex">
          {banners.map((b, i) => {
            const { label, Icon } = KIND[b.kind];
            return (
              <div key={b.id} className="relative min-w-0 flex-[0_0_100%]" aria-roledescription="slide" aria-label={`${i + 1} de ${banners.length}`}>
                <div className="relative aspect-[4/5] sm:aspect-[16/7] lg:aspect-[16/6]">
                  <Image src={b.image} alt="" fill sizes="(max-width: 1280px) 100vw, 1280px" className="object-cover" priority={i === 0} />
                  <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-ink-950/40 to-transparent sm:bg-gradient-to-r sm:from-ink-950/90 sm:via-ink-950/50" />
                  <div className="absolute inset-x-0 bottom-0 p-6 sm:inset-y-0 sm:flex sm:max-w-xl sm:flex-col sm:justify-center sm:p-12">
                    <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white uppercase backdrop-blur">
                      <Icon className="size-3.5" /> {label}
                    </span>
                    <h2 className="mt-3 text-2xl leading-tight font-extrabold text-white sm:text-4xl">{b.title}</h2>
                    <p className="mt-2 text-base text-ink-200 sm:text-lg">{b.subtitle}</p>
                    <Link href={b.href} className="mt-5 inline-flex h-12 w-fit items-center gap-2 rounded-xl bg-brand-600 px-5 font-bold text-white hover:bg-brand-700">
                      {b.ctaLabel} <ArrowRight className="size-5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <button onClick={() => embla?.scrollPrev()} className="absolute top-1/2 left-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md hover:bg-white sm:flex" aria-label="Anterior">
        <ChevronLeft className="size-5" />
      </button>
      <button onClick={() => embla?.scrollNext()} className="absolute top-1/2 right-3 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-ink-900 shadow-md hover:bg-white sm:flex" aria-label="Seguinte">
        <ChevronRight className="size-5" />
      </button>
      <div className="mt-4 flex justify-center gap-2">
        {banners.map((b, i) => (
          <button
            key={b.id}
            onClick={() => embla?.scrollTo(i)}
            className={cn("h-2.5 rounded-full transition-all", i === index ? "w-8 bg-brand-600" : "w-2.5 bg-ink-300 hover:bg-ink-400")}
            aria-label={`Ir para o destaque ${i + 1}`}
            aria-current={i === index}
          />
        ))}
      </div>
    </div>
  );
}
