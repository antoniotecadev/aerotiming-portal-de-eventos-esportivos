# ConexãoSport — Portal de eventos desportivos (Angola)

Inscrições, pagamentos (confirmação manual), check-in de kits, resultados e certificados de corridas, caminhadas, ciclismo, BTT, trail e triatlo.

**Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript · Prisma 7 · Supabase (Postgres, Auth, Storage)**

> 📋 O plano de migração, as decisões e o progresso estão em **[GUIA_MIGRACAO.md](GUIA_MIGRACAO.md)**.

## Começar (desenvolvimento)

Precisa de **Node 22** (`.nvmrc`) e de um projecto Supabase de desenvolvimento.

```bash
npm install                 # também corre "prisma generate"
cp .env.example .env        # preencher com as chaves do Supabase de desenvolvimento
npm run db:check            # testa as ligações à base de dados
npm run db:deploy           # aplica as migrações
npm run db:supabase         # triggers do Auth + RLS (prisma/sql/supabase-setup.sql)
npm run db:seed             # admin, contas de teste e dados de demonstração
npm run dev                 # http://localhost:3000
```

Contas criadas pelo seed de desenvolvimento: o admin do `.env` (`ADMIN_EMAIL` / `ADMIN_PASSWORD`) e duas contas de teste, `atleta@exemplo.ao` e `organizador@exemplo.ao`, com a palavra-passe `SEED_TEST_PASSWORD`.

> ⚠️ Depois de `prisma generate` ou de aplicar migrações, reinicie o `npm run dev` (o servidor guarda o cliente Prisma antigo).

## Produção

```bash
npm run db:deploy           # migrações (nunca "migrate dev" em produção)
npm run db:supabase         # triggers do Auth + RLS
npm run db:seed:producao    # só o admin, as modalidades e o nome do site — sem demonstração
```

Os dados reais (empresa e NIF, contactos, contas de recebimento, patrocinadores, banners, eventos) preenchem-se no painel `/admin`, que mostra o que falta em **"Antes de abrir ao público"**. A tarefa agendada (`vercel.json`) chama `/api/cron/expirar-inscricoes` com `Authorization: Bearer <CRON_SECRET>`.

`NEXT_PUBLIC_SITE_URL` tem de ter o domínio final: é usado no sitemap, no robots, nos endereços canónicos, nas imagens de partilha e no certificado.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento, build e servidor de produção |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:check` | Testa `DATABASE_URL` e `DIRECT_URL` |
| `npm run db:deploy` | Aplica as migrações de `prisma/migrations` |
| `npm run db:seed` | Dados de demonstração (só desenvolvimento; recusa correr fora de localhost) |
| `npm run db:seed:producao` | Arranque mínimo da produção |
| `npm run db:studio` | Prisma Studio |
| `npm run test:registrations` | Testes de vagas, códigos e dorsais contra a BD de desenvolvimento |

## Estrutura

```
src/
  app/
    (site)/(geral)/   páginas públicas e perfil (com o ecrã de carregamento)
    (site)/eventos/[slug], (site)/resultados/[slug]
                      verificam o evento antes do streaming (404 verdadeiro)
    (auth)/           entrar, criar conta, recuperar palavra-passe
    admin/            painel de gestão (admin e organizadores)
    checkin/          levantamento de kits (telemóvel)
    api/              certificados PDF, CSV de resultados, tarefa agendada
  server/
    queries/          leituras da BD (filtradas por permissão)
    actions/          Server Actions (escritas, sempre com verificação de permissões)
    results.ts        importação de CSV e classificações
    rate-limit.ts     limite de tentativas
  components/         interface (ui/, layout/, events/, results/, admin/…)
  lib/                tipos, formatação, utilitários partilhados
prisma/
  schema.prisma, migrations/, sql/supabase-setup.sql
  seed.ts + seed-data/   demonstração (desenvolvimento)
  seed-producao.ts       arranque da produção
```
