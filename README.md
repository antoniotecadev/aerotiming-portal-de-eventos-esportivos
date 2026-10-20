# ConexãoSport — Portal de eventos desportivos (Angola)

Inscrições, pagamentos (confirmação manual), check-in de kits, resultados e certificados de corridas, caminhadas, ciclismo, BTT, trail e triatlo.

**Next.js 16 (App Router) · React 19 · Tailwind CSS 4 · TypeScript · Prisma 7 · Supabase (Postgres, Auth, Storage) · Vercel**

> 📋 Decisões, histórico e o que falta fazer: **[GUIA_MIGRACAO.md](GUIA_MIGRACAO.md)**.

## Ambientes

| | Produção | Desenvolvimento |
|---|---|---|
| Site | https://conexaosport.vercel.app (Vercel, região `lhr1`) | http://localhost:3000 |
| Base de dados | projecto Supabase de produção (marcado com `site_settings.ambiente = "producao"`) | **o seu próprio** projecto Supabase |
| Dados | reais | de demonstração (`npm run db:seed`) |

> ⚠️ **Não use as credenciais de produção no seu `.env` para programar.** Tudo o que fizer no site local (criar eventos, inscrições, testes) vai para a base de dados real. O `npm run db:seed` e o `npm run test:registrations` recusam correr na base de dados de produção (por causa da marca acima), mas o resto não tem essa protecção.

## Começar (desenvolvimento)

Precisa de **Node 22** (`.nvmrc`; com nvm: `nvm use`) e de uma conta no [Supabase](https://supabase.com) (o plano gratuito chega).

**1. Criar o projecto Supabase de desenvolvimento** — região *West EU (London)*. Depois, em **Authentication**:
- *Sign In / Providers*: só **Email** activo; **"Confirm email" desligado** (o e-mail incluído no Supabase só envia para a equipa do projecto);
- *URL Configuration*: Site URL `http://localhost:3000` e Redirect URL `http://localhost:3000/**`;
- (opcional) *Emails → Reset Password*: modelo em português com `token_hash` — texto no GUIA, tarefa **6.4**.

**2. Criar o `.env`** (antes do `npm install`, que precisa dele para gerar o cliente Prisma):

```bash
cp .env.example .env
```

Preencha os valores — os comentários no ficheiro dizem onde encontrar cada um no Supabase. Para `CRON_SECRET`, gere um valor aleatório:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

**3. Instalar e preparar a base de dados:**

```bash
npm install                 # também corre "prisma generate"
npm run db:check            # testa as duas ligações (DATABASE_URL e DIRECT_URL)
npm run db:deploy           # cria as tabelas (migrações de prisma/migrations)
npm run db:supabase         # triggers do Auth e RLS (prisma/sql/supabase-setup.sql)
npm run db:seed             # admin do .env, contas de teste e dados de demonstração
npm run dev                 # http://localhost:3000
```

Contas criadas pelo seed: o admin (`ADMIN_EMAIL` / `ADMIN_PASSWORD`), `atleta@exemplo.ao` e `organizador@exemplo.ao` (palavra-passe `SEED_TEST_PASSWORD`). O painel de gestão está em `/admin`.

**4. Verificar:**

```bash
npm run typecheck
npm run test:registrations  # vagas, códigos e dorsais contra a BD de desenvolvimento
npm run build
```

> 💡 Depois de `prisma generate` ou de aplicar migrações, reinicie o `npm run dev` (o servidor guarda o cliente Prisma antigo). No Windows, pare o `npm run dev` antes de mover pastas em `src/app` (o servidor bloqueia-as).

### Mudar a base de dados

1. Altere `prisma/schema.prisma`.
2. Crie a migração na **sua** base de desenvolvimento: `npx prisma migrate dev --name descricao-curta` (num terminal interactivo). Se o comando não correr (terminal não interactivo), crie a pasta `prisma/migrations/<AAAAMMDDHHMMSS>_descricao/migration.sql` à mão (`npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script` ajuda) e aplique com `npm run db:deploy`.
3. Tabelas novas: o RLS tem de ficar ligado (veja a migração `rls_em_todas_as_tabelas`).
4. Faça commit da migração — o deploy de produção aplica-a sozinho (ver abaixo).

## Produção (Vercel)

### Deploy do dia-a-dia

Cada push para `main` faz deploy automático. O Vercel corre `npm run vercel-build` ([scripts/vercel-build.mjs](scripts/vercel-build.mjs)), que:
1. verifica as variáveis de ambiente obrigatórias e que nenhum segredo tem o prefixo `NEXT_PUBLIC_`;
2. **só em produção**, aplica as migrações pendentes (`prisma migrate deploy`) — as pré-visualizações não mexem na base de dados;
3. faz o `next build`.

Pull requests e ramos geram pré-visualizações; o GitHub Actions ([.github/workflows/ci.yml](.github/workflows/ci.yml)) verifica tipos e build em cada push.

### Configuração do projecto no Vercel (uma vez)

- **Build Command**: vazio (o Vercel usa o `vercel-build`). Não active as integrações sugeridas (Prisma Postgres, Supabase) — o projecto já usa o seu Supabase.
- **Environment Variables**:

| Variável | Valor |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | endereço público, com `https://` (sitemap, robots, links dos e-mails, certificados) |
| `DATABASE_URL` | Supabase → Connect → ORMs → Prisma (porta 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | idem, porta 5432 (migrações) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | chave publicável (`sb_publishable_…`) |
| `SUPABASE_SECRET_KEY` | chave secreta (`sb_secret_…`) — só servidor |
| `CRON_SECRET` | texto aleatório longo (ver acima) |

  As `ADMIN_*` e `SEED_TEST_PASSWORD` **não** vão para o Vercel (só servem aos seeds). Depois de mudar uma variável, faça *Redeploy*.
- **Supabase de produção → Authentication → URL Configuration**: Site URL = endereço público; Redirect URLs = `https://<endereço>/**`.

### Tarefa agendada

O [vercel.json](vercel.json) regista uma tarefa diária (03:00 UTC) que chama `/api/cron/expirar-inscricoes`: expira inscrições não pagas no prazo, apaga os dados de saúde 30 dias depois de cada prova (Lei n.º 22/11) e limpa contadores antigos. O Vercel envia o `CRON_SECRET` das variáveis do projecto no cabeçalho `Authorization: Bearer …`; o código compara com o mesmo valor e recusa (401) quem não o tiver. Acompanhar em *Settings → Cron Jobs* e nos *Logs*.

### Base de dados de produção nova (só se for preciso recomeçar)

```bash
npm run db:deploy
npm run db:supabase
npm run db:seed:producao    # só o admin, as modalidades, o nome do site e a marca de produção
```

Depois, no painel `/admin`, preencha os dados reais — o aviso **"Antes de abrir ao público"** diz o que falta (empresa e NIF, contactos, contas de recebimento).

### Limitações conhecidas

- **E-mail**: sem SMTP próprio no Supabase Auth (GUIA, tarefa 12.9), os e-mails de recuperação de palavra-passe só chegam à equipa do projecto Supabase.
- **Imagens**: os ficheiros carregados no painel vão para o Supabase Storage (bucket público `media`, criado no primeiro upload; plano gratuito: 1 GB).

## Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` / `build` / `start` | Desenvolvimento, build e servidor de produção local |
| `npm run vercel-build` | Build usado pelo Vercel (verificações + migrações em produção + build) |
| `npm run typecheck` | Verificação de tipos |
| `npm run db:check` | Testa `DATABASE_URL` e `DIRECT_URL` |
| `npm run db:deploy` | Aplica as migrações de `prisma/migrations` |
| `npm run db:supabase` | Triggers do Auth e RLS |
| `npm run db:seed` | Dados de demonstração (recusa a base de produção) |
| `npm run db:seed:producao` | Arranque mínimo de uma base de produção nova |
| `npm run db:studio` | Prisma Studio (ver e editar dados) |
| `npm run test:registrations` | Testes de vagas, códigos e dorsais (recusa a base de produção) |

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
    api/              certificados PDF, CSV, exportação de dados pessoais, tarefa agendada
  server/
    queries/          leituras da BD (filtradas por permissão; listas paginadas)
    actions/          Server Actions — escritas, sempre com verificação de permissões
    admin-validate.ts validação do que o painel envia
    privacy.ts        dados pessoais (exportar, apagar, prazo dos dados de saúde)
    rate-limit.ts     limite de tentativas
    results.ts        importação de CSV e classificações
  components/         interface (ui/, layout/, events/, results/, admin/…)
  lib/                tipos, formatação, utilitários partilhados
prisma/
  schema.prisma, migrations/, sql/supabase-setup.sql
  seed.ts + seed-data/   demonstração (desenvolvimento)
  seed-producao.ts       arranque de produção
scripts/              db-check, vercel-build, testes
```
