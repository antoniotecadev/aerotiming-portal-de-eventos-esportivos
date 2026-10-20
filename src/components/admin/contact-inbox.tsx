"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { CheckCheck, Inbox, Mail, RotateCcw, UserPlus } from "lucide-react";
import type { InboxMessage, InboxTab } from "@/server/queries/contact";
import { promoteFromContact, setContactHandled } from "@/server/actions/contact";
import { contactSubjectLabel } from "@/lib/contact";
import { formatDateTime } from "@/lib/format";
import { formatPhone, whatsappHref } from "@/lib/site";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Tabs } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { WhatsAppIcon } from "@/components/layout/social-icons";
import { ConfirmModal, PageTitle } from "./admin-ui";

const ROLE_LABEL = { atleta: "Atleta", organizador: "Organizador", admin: "Administrador" } as const;
const link = "inline-flex h-11 items-center gap-2 rounded-xl px-3 text-[15px] font-semibold text-ink-700 hover:bg-ink-100";

export function ContactInbox({ messages, counts, tab }: { messages: InboxMessage[]; counts: Record<InboxTab, number>; tab: InboxTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [promoting, setPromoting] = useState<InboxMessage | null>(null);

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>, success: string) =>
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) return toast({ title: "Não foi possível", description: res.error, tone: "error" });
      toast({ title: success, description: res.message });
      router.refresh();
    });

  return (
    <div className="space-y-6">
      <PageTitle title="Mensagens" description="Mensagens do formulário de contacto. Os pedidos para organizar eventos aparecem primeiro, com o botão para promover a conta." />

      <Tabs<InboxTab>
        value={tab}
        onChange={(t) => router.push(t === "por-tratar" ? pathname : `${pathname}?estado=${t}`)}
        items={[
          { id: "por-tratar", label: "Por tratar", count: counts["por-tratar"] },
          { id: "organizar", label: "Pedidos para organizar", count: counts.organizar },
          { id: "tratadas", label: "Tratadas", count: counts.tratadas },
          { id: "todas", label: "Todas", count: counts.todas },
        ]}
      />

      {messages.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title={tab === "por-tratar" ? "Nada por tratar" : "Sem mensagens"}
          description={tab === "por-tratar" ? "Quando alguém escrever pela página Contacto, a mensagem aparece aqui." : "Não há mensagens neste separador."}
        />
      ) : (
        <ul className="grid gap-3">
          {messages.map((m) => {
            const organizer = m.subject === "organizar";
            const canPromote = organizer && m.account?.role === "atleta";
            return (
              <li
                key={m.id}
                className={cn(
                  "rounded-2xl border bg-white p-4 shadow-card sm:p-5",
                  organizer && !m.handled ? "border-violet-300 ring-1 ring-violet-200" : "border-ink-200/70",
                  m.handled && "opacity-75",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {organizer ? <Badge tone="violet" dot>Quer organizar um evento</Badge> : <Badge tone="gray">{contactSubjectLabel(m.subject)}</Badge>}
                  {m.handled && <Badge tone="green">Tratada</Badge>}
                  <span className="text-sm text-ink-500">{formatDateTime(m.createdAt)}</span>
                </div>
                <p className="mt-2 text-lg font-bold text-ink-900">{m.name}</p>
                <p className="text-sm text-ink-600">
                  {m.email}
                  {m.phone && <> · {formatPhone(m.phone)}</>}
                  {" · "}
                  {m.account ? <>Conta: {ROLE_LABEL[m.account.role]}</> : <span className="text-ink-500">Sem conta no site</span>}
                </p>
                <p className="mt-3 whitespace-pre-line text-[15px] text-ink-800">{m.message}</p>

                <div className="mt-4 flex flex-wrap gap-2 border-t border-ink-100 pt-4">
                  {canPromote && !m.handled && (
                    <Button onClick={() => setPromoting(m)} disabled={pending} className="bg-violet-600 hover:bg-violet-700">
                      <UserPlus /> Promover a organizador
                    </Button>
                  )}
                  {m.handled ? (
                    <Button variant="outline" disabled={pending} onClick={() => run(() => setContactHandled({ id: m.id, handled: false }), "Mensagem reaberta")}>
                      <RotateCcw /> Reabrir
                    </Button>
                  ) : (
                    <Button variant="outline" disabled={pending} onClick={() => run(() => setContactHandled({ id: m.id, handled: true }), "Marcada como tratada")}>
                      <CheckCheck /> Marcar como tratada
                    </Button>
                  )}
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${contactSubjectLabel(m.subject)}`)}`} className={link}>
                    <Mail className="size-5" /> Responder por e-mail
                  </a>
                  {m.phone && (
                    <a href={whatsappHref(m.phone, `Olá ${m.name.split(" ")[0]}! Recebemos a sua mensagem:`)} target="_blank" rel="noopener noreferrer" className={link}>
                      <WhatsAppIcon className="size-5 text-emerald-600" /> WhatsApp
                    </a>
                  )}
                </div>
                {organizer && !m.account && !m.handled && (
                  <p className="mt-3 rounded-xl bg-violet-50 px-3.5 py-2.5 text-sm text-violet-800">
                    Esta pessoa ainda não tem conta. Peça-lhe para criar conta com o e-mail {m.email}, ou crie-a em Utilizadores, e depois promova-a aqui.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmModal
        open={!!promoting}
        onClose={() => setPromoting(null)}
        danger={false}
        title="Promover a organizador?"
        description={promoting && <>A conta de <strong>{promoting.name}</strong> ({promoting.email}) passa a poder criar eventos no painel. Os eventos ficam em rascunho até o administrador os publicar.</>}
        confirmLabel="Promover"
        onConfirm={() => {
          const m = promoting!;
          run(() => promoteFromContact({ id: m.id }), "Conta promovida a organizador");
        }}
      />
    </div>
  );
}
