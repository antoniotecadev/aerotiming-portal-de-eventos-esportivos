"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { CONTACT_SUBJECTS } from "@/lib/contact";
import { getCurrentUser, hasRole } from "../auth";

type Result = { ok: true; message?: string } | { ok: false; error: string };

const messageSchema = z.object({
  name: z.string().trim().min(3, "Escreva o seu nome.").max(120),
  email: z.string().trim().toLowerCase().max(200).pipe(z.email("Este e-mail não parece correcto.")),
  phone: z
    .string()
    .trim()
    .regex(/^(9\d{8})?$/, "9 dígitos, a começar por 9.")
    .transform((v) => (v ? `+244${v}` : null)),
  subject: z.enum(CONTACT_SUBJECTS.map((s) => s.id) as [string, ...string[]]),
  message: z.string().trim().min(10, "Conte-nos um pouco mais (pelo menos 10 letras).").max(5000),
  /** Campo escondido: só os robôs o preenchem. */
  website: z.string().optional(),
});

/** Formulário de contacto (9.8): grava em contact_messages para a caixa de mensagens do painel. */
export async function sendContactMessage(input: z.input<typeof messageSchema>): Promise<Result> {
  const parsed = messageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { website, ...data } = parsed.data;
  if (website) return { ok: true }; // robô: finge que correu bem

  // Limite simples contra repetições: 3 mensagens por e-mail em 10 minutos
  const recent = await prisma.contactMessage.count({ where: { email: data.email, createdAt: { gte: new Date(Date.now() - 10 * 60_000) } } });
  if (recent >= 3) return { ok: false, error: "Já recebemos as suas mensagens. Aguarde a nossa resposta ou fale connosco pelo WhatsApp." };

  await prisma.contactMessage.create({ data });
  return { ok: true };
}

// ───────────── Caixa de mensagens (só admin) ─────────────

async function requireAdmin() {
  const user = await getCurrentUser();
  return hasRole(user, "admin") ? user! : null;
}

export async function setContactHandled(input: { id: string; handled: boolean }): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Só o administrador pode gerir as mensagens." };
  const { count } = await prisma.contactMessage.updateMany({ where: { id: input.id }, data: { handled: input.handled } });
  if (!count) return { ok: false, error: "Mensagem não encontrada." };
  await prisma.auditLog.create({ data: { actorId: me.id, action: input.handled ? "contact.handle" : "contact.reopen", entity: "contact_message", entityId: input.id } });
  return { ok: true };
}

/** Pedido "Quero organizar um evento": promove a conta com o mesmo e-mail a organizador e marca a mensagem como tratada. */
export async function promoteFromContact(input: { id: string }): Promise<Result> {
  const me = await requireAdmin();
  if (!me) return { ok: false, error: "Só o administrador pode promover contas." };
  const msg = await prisma.contactMessage.findUnique({ where: { id: input.id }, select: { email: true } });
  if (!msg) return { ok: false, error: "Mensagem não encontrada." };
  const profile = await prisma.profile.findFirst({ where: { email: { equals: msg.email, mode: "insensitive" } }, select: { id: true, name: true, role: true } });
  if (!profile) return { ok: false, error: `Ainda não existe nenhuma conta com o e-mail ${msg.email}. Peça à pessoa para criar conta com este e-mail, ou crie-a em Utilizadores.` };
  if (profile.role !== "atleta") return { ok: false, error: `${profile.name} já é ${profile.role}.` };

  await prisma.$transaction([
    prisma.profile.update({ where: { id: profile.id }, data: { role: "organizador" } }),
    prisma.contactMessage.update({ where: { id: input.id }, data: { handled: true } }),
    prisma.auditLog.create({ data: { actorId: me.id, action: "user.promote", entity: "profile", entityId: profile.id, data: { role: "organizador", contactMessageId: input.id } } }),
  ]);
  return { ok: true, message: `${profile.name} é agora organizador. Já pode criar eventos no painel.` };
}
