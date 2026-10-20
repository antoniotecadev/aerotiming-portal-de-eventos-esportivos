"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, Check } from "lucide-react";
import { useAuth } from "@/components/auth/auth-provider";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { createEventAlert } from "@/server/actions/registrations";

/** "Avisem-me quando abrir" — grava um alerta (o envio do aviso chega com a Fase 11). */
export function AlertButton({ eventSlug, className }: { eventSlug: string; className?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <Button
      size="lg"
      variant="dark"
      className={cn(className)}
      disabled={pending || done}
      onClick={() => {
        if (!user) return router.push(`/entrar?next=${encodeURIComponent(`/eventos/${eventSlug}`)}`);
        startTransition(async () => {
          const res = await createEventAlert({ eventSlug });
          if (!res.ok) return toast({ title: "Não foi possível guardar", description: res.error, tone: "error" });
          setDone(true);
          toast({ title: "Pedido registado", description: "Vamos avisá-lo quando as inscrições abrirem." });
        });
      }}
    >
      {done ? <Check /> : <BellRing />} {done ? "Vamos avisá-lo" : "Avisem-me quando abrir"}
    </Button>
  );
}
