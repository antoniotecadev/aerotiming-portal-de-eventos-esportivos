"use client";

import { useEffect } from "react";
import { RefreshCw, WifiOff } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";

// Mostrado quando uma página falha (ex.: a base de dados não responde).
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="container-page flex max-w-xl flex-col items-center py-20 text-center">
      <span className="flex size-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
        <WifiOff className="size-8" />
      </span>
      <h1 className="mt-5 text-2xl font-extrabold tracking-tight">Não foi possível carregar esta página</h1>
      <p className="mt-2 text-ink-600">Pode ser um problema momentâneo de ligação. Tente outra vez daqui a pouco.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button onClick={reset} size="lg"><RefreshCw /> Tentar novamente</Button>
        <ButtonLink href="/" variant="outline" size="lg">Voltar ao início</ButtonLink>
      </div>
      {error.digest && <p className="mt-6 text-xs text-ink-400">Código do erro: {error.digest}</p>}
    </div>
  );
}
