"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, Maximize2, X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

/** Mostra o cartaz em ecrã inteiro, com zoom (o cartaz tem muita informação). */
export function PosterLightbox({ src, alt, open, onClose }: { src: string; alt: string; open: boolean; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    if (!open) return;
    setZoom(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex animate-fade-in flex-col bg-ink-950/95" role="dialog" aria-modal="true" aria-label={`Cartaz: ${alt}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="truncate text-sm font-semibold">{alt}</p>
        <div className="flex items-center gap-1">
          <button onClick={() => setZoom((z) => !z)} className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-white/10">
            {zoom ? <ZoomOut className="size-5" /> : <ZoomIn className="size-5" />}
            <span className="hidden sm:inline">{zoom ? "Reduzir" : "Ampliar"}</span>
          </button>
          <a href={src} download className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold hover:bg-white/10">
            <Download className="size-5" />
            <span className="hidden sm:inline">Descarregar</span>
          </a>
          <button onClick={onClose} className="flex size-10 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20" aria-label="Fechar">
            <X className="size-5" />
          </button>
        </div>
      </div>
      <div className={cn("flex-1 overflow-auto", zoom ? "cursor-zoom-out" : "flex cursor-zoom-in items-center justify-center p-4")} onClick={() => setZoom((z) => !z)}>
        <Image
          src={src}
          alt={alt}
          width={1080}
          height={1528}
          sizes={zoom ? "200vw" : "(max-width: 768px) 100vw, 60vw"}
          className={cn("mx-auto rounded-lg shadow-2xl", zoom ? "w-[200%] max-w-none sm:w-[140%] lg:w-full lg:max-w-[1080px]" : "max-h-full w-auto object-contain")}
          style={zoom ? undefined : { maxHeight: "calc(100dvh - 6rem)" }}
          priority
        />
      </div>
      <p className="pb-4 text-center text-xs text-ink-400">Toque na imagem para {zoom ? "reduzir" : "ampliar"}</p>
    </div>,
    document.body,
  );
}

/** Cartaz clicável que abre o visualizador. */
export function PosterViewer({ src, alt, className, sizes, priority }: { src: string; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={cn("group relative block w-full overflow-hidden", className)} aria-label={`Ver cartaz em tamanho grande: ${alt}`}>
        <Image src={src} alt={alt} fill sizes={sizes ?? "(max-width: 768px) 100vw, 400px"} className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" priority={priority} />
        <span className="absolute right-3 bottom-3 flex items-center gap-1.5 rounded-full bg-ink-950/75 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur transition-colors group-hover:bg-brand-600">
          <Maximize2 className="size-3.5" />
          Ver cartaz
        </span>
      </button>
      <PosterLightbox src={src} alt={alt} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
