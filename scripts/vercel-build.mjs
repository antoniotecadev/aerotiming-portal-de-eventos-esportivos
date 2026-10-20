// Build no Vercel (12.2) — chamado por "npm run vercel-build", que o Vercel usa em vez de "build".
//
// 1. Verifica as variáveis de ambiente obrigatórias (falha cedo, com uma mensagem clara).
// 2. Só em PRODUÇÃO: aplica as migrações com "prisma migrate deploy" ANTES do build. As
//    pré-visualizações (ramos e pull requests) não tocam nas migrações, para um ramo por terminar
//    não alterar a base de dados. Nunca usar "migrate dev" fora do computador de desenvolvimento.
// 3. next build.
import { execSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "local";
const production = env === "production";

const required = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SECRET_KEY",
  "NEXT_PUBLIC_SITE_URL",
  ...(production ? ["CRON_SECRET"] : []),
];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`✖ Faltam variáveis de ambiente (${env}): ${missing.join(", ")}`);
  process.exit(1);
}
if (production) {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  if (!/^https:\/\//.test(site) || /localhost|127\.0\.0\.1/.test(site)) {
    console.error(`✖ NEXT_PUBLIC_SITE_URL tem de ser o endereço público em https (agora: ${site}).`);
    process.exit(1);
  }
}
// As variáveis NEXT_PUBLIC_ vão para o browser: nenhuma pode conter um segredo
const leaked = Object.entries(process.env).filter(
  ([k, v]) =>
    k.startsWith("NEXT_PUBLIC_") &&
    v &&
    (/SECRET|SERVICE_ROLE|PASSWORD/i.test(k) || [process.env.SUPABASE_SECRET_KEY, process.env.CRON_SECRET].some((secret) => secret && secret.length >= 20 && v === secret)),
);
if (leaked.length) {
  console.error(`✖ Segredo exposto ao browser em: ${leaked.map(([k]) => k).join(", ")}. Retire o prefixo NEXT_PUBLIC_.`);
  process.exit(1);
}

const run = (cmd) => {
  console.log(`\n▶ ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

if (production) run("npx prisma migrate deploy");
else console.log(`\n(${env}: migrações não aplicadas — só em produção)`);
run("npx next build");
