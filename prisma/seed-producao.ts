// Arranque da base de dados de PRODUÇÃO (12.7): só o mínimo, sem dados de demonstração.
// Uso: npm run db:seed:producao   (depois de npm run db:deploy e npm run db:supabase, com o .env de produção)
//
// - Cria o admin master no Supabase Auth (ADMIN_EMAIL / ADMIN_PASSWORD).
// - Cria as modalidades (corrida, caminhada, ciclismo…).
// - Grava o nome do site em Definições.
// NÃO cria eventos, inscrições, contas de teste, patrocinadores, banners nem contas de pagamento:
// tudo isso é preenchido no painel com os dados reais. Pode correr várias vezes (não apaga nem
// substitui nada que já exista).

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { CATEGORIES } from "./seed-data/catalog";

function env(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Falta a variável ${name} no .env`);
  return v;
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env("DIRECT_URL") }) });
const AUTH_URL = `${env("NEXT_PUBLIC_SUPABASE_URL")}/auth/v1/admin/users`;
const AUTH_HEADERS = { apikey: env("SUPABASE_SECRET_KEY"), Authorization: `Bearer ${env("SUPABASE_SECRET_KEY")}`, "Content-Type": "application/json" };

async function authAdmin<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: AUTH_HEADERS });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Supabase Auth ${res.status}: ${body.msg ?? body.message ?? body.error_description ?? JSON.stringify(body)}`);
  return body as T;
}

async function ensureAdmin() {
  const email = env("ADMIN_EMAIL").trim().toLowerCase();
  const password = env("ADMIN_PASSWORD");
  const name = process.env.ADMIN_NAME || "Administrador";
  if (password.length < 12) throw new Error("Use uma ADMIN_PASSWORD com pelo menos 12 caracteres em produção.");

  let id: string | undefined;
  for (let page = 1; !id; page++) {
    const { users } = await authAdmin<{ users: { id: string; email?: string }[] }>(`${AUTH_URL}?page=${page}&per_page=1000`);
    id = users.find((u) => u.email?.toLowerCase() === email)?.id;
    if (users.length < 1000) break;
  }
  const created = !id;
  if (!id) {
    const user = await authAdmin<{ id: string }>(AUTH_URL, { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) });
    id = user.id;
  }
  // O trigger do Supabase já cria o perfil; o upsert garante o papel de admin
  await prisma.profile.upsert({ where: { id }, create: { id, email, name, role: "admin" }, update: { role: "admin", active: true } });
  return created;
}

async function main() {
  console.log("A preparar a base de dados de produção (sem dados de demonstração)…");
  const created = await ensureAdmin();
  console.log(`  admin ${process.env.ADMIN_EMAIL}: ${created ? "criado" : "já existia (papel de admin confirmado)"}`);

  const cats = await prisma.category.createMany({
    data: CATEGORIES.map((c, i) => ({ slug: c.slug, name: c.name, description: c.description, sortOrder: i })),
    skipDuplicates: true,
  });
  console.log(`  modalidades: ${cats.count} criadas`);

  // Marca de produção: o seed de demonstração e os testes recusam correr nesta base de dados
  await prisma.siteSetting.upsert({ where: { key: "ambiente" }, create: { key: "ambiente", value: "producao" }, update: { value: "producao" } });
  console.log("  marca de produção (site_settings.ambiente): ✔");

  const site = await prisma.siteSetting.findUnique({ where: { key: "site" } });
  if (!site) await prisma.siteSetting.create({ data: { key: "site", value: { siteName: "ConexãoSport", tagline: "Eventos desportivos em Angola" } } });
  console.log(`  definições do site: ${site ? "já existiam" : "criadas (só o nome)"}`);

  const [payments, events] = await Promise.all([prisma.siteSetting.findUnique({ where: { key: "payment_accounts" } }), prisma.event.count()]);
  console.log("\nFalta preencher no painel (/admin), com os dados reais:");
  console.log("  • Definições → empresa (nome legal, NIF), contactos e redes sociais");
  console.log(`  • Pagamentos → Contas e WhatsApp ${payments ? "(já há contas gravadas — confirme-as)" : "(ainda sem contas de recebimento)"}`);
  console.log("  • Patrocinadores e banners da página inicial");
  console.log(`  • Eventos (${events} na base de dados)`);
}

main()
  .catch((e) => {
    console.error("\n✖ Falhou:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
