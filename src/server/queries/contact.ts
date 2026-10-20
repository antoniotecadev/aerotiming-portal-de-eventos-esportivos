import "server-only";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import type { UserRole } from "@/lib/types";

export type InboxTab = "por-tratar" | "organizar" | "tratadas" | "todas";

export interface InboxMessage {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  handled: boolean;
  createdAt: string;
  /** Conta com o mesmo e-mail (se existir) — para "Promover a organizador". */
  account: { id: string; role: UserRole } | null;
}

const TAB_WHERE = {
  "por-tratar": { handled: false },
  organizar: { subject: "organizar" },
  tratadas: { handled: true },
  todas: {},
} as const;

/** Caixa de mensagens do formulário de contacto (só admin — a página verifica). Pedidos "organizar" por tratar aparecem primeiro. */
export async function listContactMessages(tab: InboxTab) {
  await connection();
  const [rows, counts] = await Promise.all([
    prisma.contactMessage.findMany({ where: TAB_WHERE[tab], orderBy: { createdAt: "desc" }, take: 200 }),
    Promise.all((Object.keys(TAB_WHERE) as InboxTab[]).map((t) => prisma.contactMessage.count({ where: TAB_WHERE[t] }))),
  ]);

  const emails = [...new Set(rows.map((r) => r.email.toLowerCase()))];
  const profiles = emails.length
    ? await prisma.profile.findMany({ where: { OR: emails.map((e) => ({ email: { equals: e, mode: "insensitive" as const } })) }, select: { id: true, email: true, role: true } })
    : [];
  const byEmail = new Map(profiles.map((p) => [p.email.toLowerCase(), { id: p.id, role: p.role }]));

  const isOpenOrganizer = (r: { subject: string; handled: boolean }) => r.subject === "organizar" && !r.handled;
  const messages: InboxMessage[] = rows
    .map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), account: byEmail.get(r.email.toLowerCase()) ?? null }))
    .sort((a, b) => Number(isOpenOrganizer(b)) - Number(isOpenOrganizer(a)));

  return { messages, counts: Object.fromEntries((Object.keys(TAB_WHERE) as InboxTab[]).map((t, i) => [t, counts[i]])) as Record<InboxTab, number> };
}
