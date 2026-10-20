// Configuração da CLI do Prisma (migrate, studio, seed).
// O Prisma 7 não lê o .env sozinho — por isso o import do dotenv.
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  // A CLI usa a ligação DIRECTA (session pooler, porta 5432).
  // A aplicação usa DATABASE_URL (transaction pooler) — ver src/lib/db.ts.
  datasource: {
    url: env("DIRECT_URL"),
  },
});
