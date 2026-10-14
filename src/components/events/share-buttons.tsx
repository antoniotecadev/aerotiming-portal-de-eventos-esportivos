"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
import { WhatsAppIcon, FacebookIcon } from "@/components/layout/social-icons";

export function ShareButtons({ title, path }: { title: string; path: string }) {
  const [copied, setCopied] = useState(false);
  const url = () => `${window.location.origin}${path}`;
  const btn = "flex size-11 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-700 hover:bg-ink-50";

  return (
    <div className="flex items-center gap-2">
      <span className="mr-1 text-sm font-semibold text-ink-500"><Share2 className="mr-1 inline size-4" />Partilhar</span>
      <button className={btn} aria-label="Partilhar no WhatsApp" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(`${title} — ${url()}`)}`, "_blank")}>
        <WhatsAppIcon className="size-5 text-[#25D366]" />
      </button>
      <button className={btn} aria-label="Partilhar no Facebook" onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url())}`, "_blank")}>
        <FacebookIcon className="size-5 text-[#1877F2]" />
      </button>
      <button
        className={btn}
        aria-label="Copiar ligação"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
      >
        {copied ? <Check className="size-5 text-emerald-600" /> : <Link2 className="size-5" />}
      </button>
    </div>
  );
}
