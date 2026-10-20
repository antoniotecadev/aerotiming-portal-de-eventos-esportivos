// Testa as ligações à base de dados sem mostrar credenciais.
// Uso: npm run db:check
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

function describe(url: string | undefined) {
  if (!url) return "(não definida)";
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || "5432"}${u.pathname}${u.search ? ` (${u.search.slice(1)})` : ""}`;
  } catch {
    return "(URL inválida — confirme o formato e codifique caracteres especiais na palavra-passe)";
  }
}

async function check(label: string, url: string | undefined) {
  console.log(`\n${label}: ${describe(url)}`);
  if (!url) return false;
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  try {
    const started = Date.now();
    const [row] = await prisma.$queryRaw<{ version: string; db: string; user: string }[]>`
      select version() as version, current_database() as db, current_user as "user"`;
    console.log(`  ✔ ligado em ${Date.now() - started} ms · base "${row.db}" · utilizador "${row.user}"`);
    console.log(`  ${row.version.split(",")[0]}`);
    return true;
  } catch (e) {
    console.log(`  ✖ falhou: ${(e as Error).message.split("\n")[0]}`);
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

(async () => {
  const app = await check("DATABASE_URL (aplicação, transaction pooler)", process.env.DATABASE_URL);
  const cli = await check("DIRECT_URL (migrações, session pooler)", process.env.DIRECT_URL);
  process.exit(app && cli ? 0 : 1);
})();
