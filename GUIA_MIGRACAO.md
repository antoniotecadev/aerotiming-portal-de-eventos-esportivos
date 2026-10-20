# Guia de migração — dos dados mock para base de dados real

> **Objectivo:** passar o portal AeroTiming de dados mock para uma base de dados real (Supabase + Prisma), depois autenticação real, inscrições, pagamentos e admin — **um passo de cada vez**.
>
> Este ficheiro é a **fonte de verdade do progresso**. Quem abrir o projecto deve conseguir saber, só a olhar para aqui, o que já está feito e o que falta.

---

## Como usar este guia

1. Trabalhe **pela ordem das fases**. Dentro de cada fase, siga as tarefas por ordem — a maioria depende da anterior.
2. Ao terminar uma tarefa, **marque-a** e acrescente a data e o seu nome:
   ```md
   - [x] **1.3** Criar o cliente Prisma em `src/lib/db.ts` — ✅ 2026-10-21 (António)
   ```
3. Se uma tarefa ficar a meio ou bloqueada, deixe `[ ]` e escreva uma nota por baixo:
   ```md
   - [ ] **5.4** Login por SMS
     > ⚠️ Bloqueado: falta escolher o fornecedor de SMS (ver Decisões pendentes).
   ```
4. Quando todas as tarefas de uma fase estiverem marcadas, actualize o **Painel de progresso** abaixo.
5. Use o número da tarefa nas mensagens de commit: `feat(db): 2.4 modelo de inscrições`.
6. Registe no **Diário de alterações** (fim do ficheiro) qualquer decisão ou desvio ao plano.

**Legenda:** `[ ]` por fazer · `[x]` feito · ⚠️ bloqueado / atenção · 💡 dica · ⏸️ adiado (não fazer por agora) · ❌ descartado

---

## Painel de progresso

| Fase | Descrição | Estado |
|---|---|---|
| 0 | Frontend com dados mock (já existente) | ✅ Concluída |
| 1 | Preparar Supabase e variáveis de ambiente | ✅ Concluída |
| 2 | Instalar e configurar o Prisma | ✅ Concluída |
| 3 | Modelar a base de dados (schema) | ✅ Concluída |
| 4 | Migrações, segurança da BD e seed | ✅ Concluída |
| 5 | Camada de dados: trocar mock por queries reais | ✅ Concluída |
| 6 | Autenticação real (Supabase Auth) | ✅ Concluída (6.14 e permissões por evento ficam para a Fase 9) |
| 7 | Inscrições reais | ✅ Concluída |
| 8 | Pagamentos com confirmação manual (admin / organizador) | ✅ Concluída (página Inscrições do painel passa para a BD na Fase 9) |
| 9 | Admin real + upload de ficheiros | ✅ Concluída (9.7 adiada) |
| 10 | Resultados reais | ✅ Concluída (10.6 fica para o futuro) |
| 11 | Notificações (SMS / e-mail) | ⏸️ Adiada (D3) |
| 12 | Produção: deploy, segurança e monitorização | ⬜ Por começar |

Estados: ⬜ Por começar · 🟡 Em curso · ✅ Concluída · ⏸️ Adiada

---

## Arquitectura alvo

```
Browser ──► Next.js 16 (App Router)
              ├─ Server Components  ──► src/server/queries/*  ──► Prisma ──► Supabase Postgres
              ├─ Server Actions     ──► src/server/actions/*  ──► Prisma
              ├─ Route Handlers     ──► exportações (CSV); webhooks de pagamento só no futuro
              ├─ src/proxy.ts       ──► renova a sessão Supabase em cada pedido
              └─ Supabase Auth (sessão em cookies via @supabase/ssr)
            Supabase Storage ──► cartazes, banners, logótipos, regulamentos (PDF), GPX, comprovativos de pagamento (privado)
```

**Regras de base (decididas):**

- **Prisma** para *todo* o acesso a dados. **Supabase** fornece Postgres, Auth e Storage.
- O browser **nunca** fala directamente com a base de dados. Componentes cliente recebem dados por *props* ou chamam **Server Actions**.
- A autorização (quem pode ver ou alterar o quê) é feita **no servidor**, em `src/server/*`. O Prisma liga-se com um utilizador que ignora o RLS. Por isso o RLS fica **activado e sem políticas**, para bloquear o acesso pela API pública do Supabase (ver tarefa 4.3).
- **Pagamentos são confirmados manualmente pelo admin ou pelo organizador do evento** (decisões D1 e D10). O atleta paga por Multicaixa Express, transferência (IBAN), depósito ou KWiK, para as contas do evento (D9), e envia o comprovativo. Não há gateway nem confirmação automática por agora.
- **Páginas públicas sempre dinâmicas** (D4): cada visita ou recarregamento lê os dados actuais da BD. Não há cache para invalidar.
- Os tipos de `src/lib/types.ts` continuam a ser o contrato da interface. As queries convertem os registos da BD para estes tipos (os *mappers*), para mexer o mínimo possível nos componentes.

---

## Utilizadores, papéis e permissões

**Uma só conta por pessoa.** Toda a gente cria conta da mesma forma; o que muda é o **papel**. Um organizador continua a poder inscrever-se em provas com a mesma conta.

### Como cada um entra no sistema

| Papel | Como se obtém | O que pode fazer |
|---|---|---|
| **Atleta** (utilizador normal) | Cria conta no site: **nome, e-mail e palavra-passe** — só isto | Inscrever-se, enviar comprovativo de pagamento, ver bilhete e resultados, editar os seus dados |
| **Organizador** | Pede em **"Organize o seu evento"** (formulário de contacto, assunto "organizar"); o **admin promove** a conta em `/admin/utilizadores` | Tudo o que o atleta faz + **painel de gestão limitado aos seus eventos** |
| **Staff** (por evento) | O organizador ou o admin acrescenta uma conta à equipa de um evento | Só o **check-in de kits** desse evento |
| **Admin** | O **admin master é criado pelo seed** (`ADMIN_EMAIL` / `ADMIN_PASSWORD` no `.env`); outros admins são promovidos por um admin | Tudo |

- Ninguém escolhe ser organizador no registo. Isto mantém o registo simples para o atleta e impede contas falsas de organizador.
- **Login apenas por e-mail + palavra-passe** (sem SMS).
- Os dados necessários para a prova (telemóvel, BI, data de nascimento, t-shirt, contacto de emergência) são pedidos **na primeira inscrição** e guardados no perfil. Nas inscrições seguintes vêm preenchidos.

### Perfil (`/perfil`): igual para todos
Resumo · As minhas inscrições · Os meus resultados · Os meus dados · Segurança.
Organizadores, staff e admins vêem também o botão **"Painel de gestão"** no menu da conta e no Resumo.

### Painel de gestão (`/admin`): o menu depende do papel

| Área | Admin | Organizador | Staff |
|---|---|---|---|
| Painel (indicadores) | todos os eventos | os seus eventos | — |
| Eventos | todos; **publicar** | criar e editar os seus; **pedir publicação** | — |
| Inscrições | todas | dos seus eventos | — |
| Pagamentos por confirmar | todos | dos seus eventos (D10) | — |
| Check-in de kits | todos | os seus eventos | os eventos onde é staff |
| Resultados | todos | os seus eventos | — |
| Utilizadores, Banners, Patrocinadores, Categorias, Definições | ✔ | — | — |

> O organizador cria o evento em **rascunho** e pede a publicação; **o admin publica** (D11). Assim nenhum evento falso aparece no site a receber inscrições e dinheiro.

---

## Fase 0 — Frontend com dados mock ✅

Já feito. Fica aqui como referência do ponto de partida.

- [x] **0.1** Migração do protótipo Vite para Next.js 16 + Tailwind 4 — ✅ 2026-10-14
- [x] **0.2** Páginas públicas: Home, Eventos, Detalhe do evento, Inscrição, Inscritos, Calendário, Resultados — ✅ 2026-10-14
- [x] **0.3** Conta e perfil (autenticação simulada em `localStorage`) — ✅ 2026-10-14
- [x] **0.4** Painel de admin (store local em `localStorage`) — ✅ 2026-10-14
- [x] **0.5** Páginas institucionais: Sobre, Ajuda, Contacto, Termos, Privacidade — ✅ 2026-10-14

**Onde estão os mocks hoje** (o que vamos substituir):

| Ficheiro | Papel actual |
|---|---|
| `src/lib/data/*.ts` | Dados mock e funções de consulta (`getEvent`, `upcomingEvents`, `resultsOf`…) |
| `src/lib/data/index.ts` → `TODAY` | Data fixa `2026-10-14`, a trocar por `new Date()` |
| `src/components/auth/auth-provider.tsx` | Login falso em `localStorage` |
| `src/components/admin/admin-store.tsx` | CRUD do admin em `localStorage` |

---

## Fase 1 — Preparar Supabase e variáveis de ambiente

- [x] **1.1** Criar conta em [supabase.com](https://supabase.com) e um projecto `aerotiming` (ou `aerotiming-dev` para desenvolvimento). — ✅ 2026-10-20
  - Escolher a região disponível com menor latência para Angola (normalmente Europa Ocidental). Confirmar a lista de regiões no painel.
  - **Guardar a palavra-passe da base de dados** num gestor de senhas: não volta a ser mostrada.
- [x] **1.2** Ambientes: por agora **só desenvolvimento**. O projecto Supabase actual é o de desenvolvimento. O projecto de produção será criado mais tarde, na tarefa **12.1**. Nunca testar migrações em produção. — ✅ 2026-10-20 (decisão)
- [x] **1.3** Copiar as *connection strings*: painel → **Connect** → **ORMs / Prisma**: — ✅ 2026-10-20 (região `eu-west-2`, Londres; Postgres 17)
  - **Transaction pooler** (porta `6543`) → `DATABASE_URL` (usada pela aplicação)
  - **Session pooler** (porta `5432`) → `DIRECT_URL` (usada pelas migrações)
  > 💡 A ligação directa `db.<ref>.supabase.co` só funciona com IPv6. Use o *session pooler* se a sua rede for só IPv4.
- [x] **1.4** Copiar as chaves da API: painel → **Project Settings → API Keys**: — ✅ 2026-10-20
  - URL do projecto → `NEXT_PUBLIC_SUPABASE_URL`
  - Chave publicável (`sb_publishable_…`, ou a antiga `anon`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - Chave secreta (`sb_secret_…`, ou a antiga `service_role`) → `SUPABASE_SECRET_KEY` ⚠️ **só no servidor, nunca com o prefixo `NEXT_PUBLIC_`**
- [x] **1.5** Actualizar o `.env.example` com as variáveis abaixo (sem valores reais) e criar o `.env` local com os valores verdadeiros. O `.env` já está no `.gitignore`. — ✅ 2026-10-20 (`.env.example` actualizado e `.env` criado; faltam os valores reais, ver 1.3 e 1.4)

```bash
# .env.example
NEXT_PUBLIC_SITE_URL="http://localhost:3000"

# Base de dados (Supabase → Connect → ORMs)
DATABASE_URL="postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGIAO>.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<REF>:<PASSWORD>@aws-0-<REGIAO>.pooler.supabase.com:5432/postgres"

# Supabase (Project Settings → API Keys)
NEXT_PUBLIC_SUPABASE_URL="https://<REF>.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
SUPABASE_SECRET_KEY="sb_secret_..."   # só servidor
```

- [x] **1.6** Confirmar que o `.env` **não** aparece em `git status`. — ✅ 2026-10-20

---

## Fase 2 — Instalar e configurar o Prisma

> ⚠️ A tag `latest` do npm aponta, neste momento, para uma versão RC do Prisma 8. Use a **última versão estável 7.x** (testado com `7.10.1`) e fixe-a no `package.json`.
> O Prisma 7 mudou bastante em relação às versões antigas: a URL da base de dados passa para o `prisma.config.ts`, o `.env` não é carregado sozinho e é obrigatório usar um *driver adapter*.

- [x] **2.1** Instalar as dependências: — ✅ 2026-10-20
  ```bash
  npm i -D prisma@7.10.1 tsx dotenv
  npm i @prisma/client@7.10.1 @prisma/adapter-pg@7.10.1 pg server-only zod
  npm i -D @types/pg
  ```
- [x] **2.2** Inicializar: — ✅ 2026-10-20
  ```bash
  npx prisma init --datasource-provider postgresql --output ../src/generated/prisma
  ```
  Cria `prisma/schema.prisma` e um ficheiro de configuração. **Renomeie-o para `prisma.config.ts`** se tiver outro nome e deixe-o assim:
  ```ts
  // prisma.config.ts
  import "dotenv/config";
  import { defineConfig } from "prisma/config";

  export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: {
      path: "prisma/migrations",
      seed: "tsx prisma/seed.ts",
    },
    // A CLI (migrate, studio) usa a ligação DIRECTA, não o pooler
    datasource: { url: process.env["DIRECT_URL"] },
  });
  ```
  Apague o `.env` que o `prisma init` criar, se já tiver o seu.
- [x] **2.3** Acrescentar `src/generated/` ao `.gitignore` (o cliente é gerado em cada máquina e no build). — ✅ 2026-10-20
- [x] **2.4** Criar o cliente Prisma único em `src/lib/db.ts`: — ✅ 2026-10-20
  ```ts
  import "server-only";
  import { PrismaPg } from "@prisma/adapter-pg";
  import { PrismaClient } from "@/generated/prisma/client";

  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

  export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });

  // Evita criar dezenas de ligações com o hot reload em desenvolvimento
  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
  ```
- [x] **2.5** Acrescentar scripts ao `package.json`: — ✅ 2026-10-20
  ```json
  "postinstall": "prisma generate",
  "db:generate": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:deploy": "prisma migrate deploy",
  "db:seed": "prisma db seed",
  "db:studio": "prisma studio",
  "db:reset": "prisma migrate reset"
  ```
- [x] **2.6** Testar a ligação: `npx prisma db pull --print` deve responder sem erro (ainda não há tabelas). — ✅ 2026-10-20 — usar `npm run db:check` (testa as duas ligações sem mostrar a palavra-passe)

---

## Fase 3 — Modelar a base de dados (schema) ✅

> 📄 **Fonte de verdade: [`prisma/schema.prisma`](prisma/schema.prisma).** O guia não repete o schema, para não ficarem duas versões diferentes. Qualquer alteração é feita no ficheiro e gera uma migração nova (Fase 4).

- [x] **3.1** Escrever o schema em `prisma/schema.prisma`. — ✅ 2026-10-20
- [x] **3.2** Rever o schema (campos, obrigatórios/opcionais, índices, regras) e aplicar as decisões D1–D10 (ver abaixo). — ✅ 2026-10-20
- [x] **3.3** `npx prisma format`, `npx prisma validate` e `npx prisma generate` sem erros; SQL da primeira migração pré-visualizado com `prisma migrate diff` (22 tabelas, 14 enums). — ✅ 2026-10-20

### Modelos

| Área | Tabelas |
|---|---|
| Utilizadores | `profiles` (mesmo `id` do Supabase Auth) |
| Catálogo | `categories`, `sponsors`, `banners`, `site_settings` |
| Eventos | `events`, `event_staff`, `event_distances`, `price_tiers`, `event_routes`, `route_points`, `kit_pickups`, `schedule_items`, `regulation_sections`, `event_sponsors`, `event_alerts` |
| Inscrições | `registrations`, `payments`, `counters` |
| Resultados | `results` |
| Outros | `contact_messages`, `audit_logs` |

### Regras principais

- **Uma tabela de inscrições:** `Participant` + `Registration` do mock juntam-se em `registrations`. Guarda uma cópia dos dados do atleta e tem `userId` opcional, para permitir inscrição sem conta (D6).
- **Pagamentos manuais** em `payments`: `pendente → em_analise → confirmado | rejeitado` (D1, D10). As contas de recebimento são do evento (`events.payment_accounts`), com as da AeroTiming em `site_settings` como alternativa (D9).
- **Tempos** em milissegundos (`chipTimeMs`, `gunTimeMs`); **preços** em Kz inteiros.
- **Datas:** dias de calendário em `@db.Date`; instantes em `@db.Timestamptz(3)`. A hora de Luanda (WAT) é aplicada na formatação.
- Nomes em `snake_case` na BD e `camelCase` no código.

### Notas da revisão (3.2)

Mudanças em relação à primeira proposta, e porquê:

1. **Todos os instantes passaram a `Timestamptz`.** O `DateTime` do Prisma, por omissão, grava *sem* fuso horário e confunde UTC com a hora de Luanda.
2. **"Últimas vagas" e "Esgotado" deixaram de ser estados guardados** e passam a ser calculados a partir das vagas no *mapper* (5.2). Guardados, ficariam desactualizados. Entrou o estado `inscricoes_encerradas`.
3. **Uma só inscrição *activa* por documento e evento:** índice único **parcial** (`partialIndexes`, preview do Prisma 7.10). A versão anterior impedia de se inscrever de novo depois de cancelar ou expirar.
4. **Novo modelo `EventStaff`** (D5): organizadores e voluntários de check-in por evento. Substitui o `createdById` do evento.
5. **Dorsais por distância:** `bibStart` / `nextBib` em `event_distances` (ex.: 42 km a partir do 1001), atribuídos de forma atómica (7.2).
6. **Novo modelo `Counter`** para gerar o código `AT-2026-00001` sem repetições, mesmo com inscrições em simultâneo.
7. **Inscrições:** consentimento da declaração de saúde (`healthDeclarationAt`, Lei 22/11), quem entregou o kit (`kitPickedUpById`) e quem criou no painel (`createdById`). Novo estado `expirada`. Índices por telefone, e-mail e documento, para associar inscrições a contas (D6).
8. **Sem chave estrangeira de `profiles` para `auth.users`.** O Prisma não gere o schema `auth` e a base temporária usada pelas migrações não o tem. O perfil é criado e apagado por *triggers* (Fase 4.2).
9. **Mais índices** para as listagens públicas (eventos por estado, categoria ou província com data) e para o admin (pagamentos por estado e data, auditoria por autor).
10. **Eventos com inscrições não podem ser apagados** (`Restrict`): no admin, "eliminar" passa a "cancelar" (9.4).

---

## Fase 4 — Migrações, segurança da BD e seed

- [x] **4.1** Criar a primeira migração no projecto **dev**: — ✅ 2026-10-20 (migração `20261020035815_init`)
  ```bash
  npm run db:migrate -- --name init
  ```
  Confirmar as 22 tabelas no painel do Supabase (Table Editor) ou com `npm run db:studio`.

> **Porque é que há SQL fora das migrações do Prisma?** O `prisma migrate dev` testa as migrações numa base temporária (*shadow database*), que **não tem o schema `auth` do Supabase**. Os triggers sobre `auth.users` falhariam lá. Por isso ficam num ficheiro SQL à parte, **idempotente** (pode correr-se várias vezes), aplicado com `prisma db execute`. Triggers e RLS não interferem com o Prisma Migrate.

- [x] **4.2** Criar `prisma/sql/supabase-setup.sql` com: — ✅ 2026-10-20 (`prisma/sql/supabase-setup.sql`)
  - **Perfil automático:** função + trigger `after insert on auth.users`, que cria o `profiles` com `name` e `phone` vindos de `raw_user_meta_data` (preenchidos no registo, tarefa 6.6).
  - **E-mail sincronizado:** trigger `after update of email on auth.users`, que actualiza `profiles.email`.
  - **Apagar conta:** trigger `after delete on auth.users`, que apaga o `profiles`. As inscrições ficam com `user_id = null` e não se perdem os resultados.
  - **RLS em todas as tabelas** do schema `public`, sem políticas (bloqueia a API pública do Supabase; o Prisma continua a funcionar):
    ```sql
    do $$
    declare t record;
    begin
      for t in select tablename from pg_tables
               where schemaname = 'public' and tablename <> '_prisma_migrations' loop
        execute format('alter table public.%I enable row level security', t.tablename);
      end loop;
    end $$;
    ```
  - Usar sempre `create or replace function` e `drop trigger if exists … ; create trigger …`, para o ficheiro poder ser reaplicado.
  - Funções com `security definer set search_path = ''` e nomes de tabela completos (`public.profiles`).
- [x] **4.3** Script `"db:supabase": "prisma db execute --file prisma/sql/supabase-setup.sql"` no `package.json`. Correr **depois de cada migração** (garante o RLS nas tabelas novas). — ✅ 2026-10-20 (23 tabelas com RLS; a API pública devolve 0 linhas)
  - Confirmar no painel: **Advisors → Security** sem avisos "RLS disabled".
  - Testar o trigger: criar um utilizador em **Authentication → Users** e confirmar que aparece em `profiles`.
- [x] **4.4** Escrever `prisma/seed.ts`, que importa os mocks de `src/lib/data` e os insere na BD (categorias → patrocinadores → banners → eventos com distâncias/preços/percursos/kit/programa/regulamento → inscrições + pagamentos → resultados). — ✅ 2026-10-20 (`prisma/seed.ts`; idempotente — testado a correr duas vezes)
  - Converter: `"inscricoes-abertas"` → `inscricoes_abertas`; `"ultimas-vagas"` / `"esgotado"` → `inscricoes_abertas` (passam a ser calculados); `"HH:MM:SS"` → milissegundos; `"Passaporte"` → `PASSAPORTE`; método `referencia` → `transferencia`; telefones → formato `+244…`.
  - Preencher `bibStart` / `nextBib` por distância, de acordo com os dorsais do mock, e o `Counter` `registration:2026`.
  - Usar `upsert` por `slug` / `code`, para o seed poder correr várias vezes.
  - **Admin master:** com a `SUPABASE_SECRET_KEY`, criar o utilizador pela API REST de administração do Supabase Auth (`POST /auth/v1/admin/users` com `email_confirm: true`), usando `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD` do `.env`. O trigger (4.2) cria o perfil; o seed muda o `role` para `admin`. Se o utilizador já existir, não o recria (idempotente).
  - **Contas de teste** (só em dev): `atleta@exemplo.ao` e `organizador@exemplo.ao` (dono da Maratona de Luanda e do Gran Fondo em `event_staff`), criados da mesma forma, com palavras-passe do `.env` (`SEED_TEST_PASSWORD`).
  - As inscrições do mock ficam associadas ao atleta de teste ou sem `userId` (são dados de demonstração).
- [x] **4.5** Correr `npm run db:seed` e confirmar as contagens (12 eventos, ~1100 inscrições, resultados de 3 provas) e que consegue entrar com o admin master. — ✅ 2026-10-20 (12 eventos · 1060 inscrições · 290 resultados · pagamentos: 908 confirmados, 50 em análise, 70 pendentes, 32 cancelados; login das 3 contas testado)
- [x] **4.6** Copiar as imagens de `public/images/` para o Supabase Storage na Fase 9. Até lá, o seed guarda os caminhos locais (`/images/cartazes/...`), que continuam a funcionar. — ✅ 2026-10-20 (o seed usa os caminhos locais `/images/...`)

---

## Fase 5 — Camada de dados: trocar mock por queries reais ✅

**Estratégia:** criar `src/server/queries/` com funções **com o mesmo nome e o mesmo tipo de retorno** que as de `src/lib/data/index.ts`, mas `async`. Depois trocar página a página. O mock só é apagado no fim (5.12).

- [x] **5.1** Ler os guias do Next 16 sobre dados e renderização dinâmica: `node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`, `08-caching.md` e `02-guides/caching-without-cache-components.md`. Aplicar D4: páginas públicas **dinâmicas** (sem cache). — ✅ 2026-10-20 (padrão: `await connection()` em cada query)
- [x] **5.2** Criar `src/server/mappers.ts`: converte os registos do Prisma nos tipos de `src/lib/types.ts` (enums `_` → `-`, ms → `HH:MM:SS`, `Decimal` → `number`, `Date` → `YYYY-MM-DD`). Calcula o estado mostrado ao público: `inscricoes_abertas` passa a "Últimas vagas" com menos de 10% de vagas livres e a "Esgotado" sem vagas; depois do prazo de inscrição, "Inscrições encerradas". — ✅ 2026-10-20 (calcula também "Últimas vagas", "Esgotado" e "Inscrições encerradas")
- [x] **5.3** Mover as funções **puras** (`currentTier`, `minPrice`, `slotsLeft`, `isOpen`, `filterEvents`) para `src/lib/event-utils.ts`, para poderem ser usadas no servidor e no cliente sem importar os mocks. — ✅ 2026-10-20 (`src/lib/event-utils.ts`)
- [x] **5.4** Trocar `TODAY` por uma função `today()` que devolve a data de hoje em Luanda (`Africa/Luanda`) no formato `YYYY-MM-DD`. — ✅ 2026-10-20 (`src/lib/today.ts`)
- [x] **5.5** Criar as queries (todas com `import "server-only"`): — ✅ 2026-10-20 (`src/server/queries/`; `cache()` do React evita ler o mesmo evento duas vezes por pedido)
  - [x] `events.ts` → `getEventBySlug`, `listUpcomingEvents`, `listPastEvents`, `listRecentEvents`, `searchEvents(filters)`, `listEventsByMonth`
  - [x] `catalog.ts` → `listCategories`, `listActiveSponsors`, `listActiveBanners`, `getSiteSettings`
  - [x] `registrations.ts` → `listPublicParticipants(eventSlug)` (**só campos públicos**: dorsal, nome, sexo, escalão, distância, clube, província, estado do pagamento — nunca BI, telefone ou e-mail)
  - [x] `results.ts` → `listResults(eventSlug)`, `searchResults(q)`, `hasResults`
- [x] **5.6** Trocar as páginas (Server Components) para usar as queries: — ✅ 2026-10-20
  - [x] `src/app/(site)/page.tsx` (Home)
  - [x] `src/app/(site)/eventos/[slug]/page.tsx`
  - [x] `src/app/(site)/eventos/[slug]/inscritos/page.tsx`
  - [x] `src/app/(site)/eventos/[slug]/inscricao/page.tsx`
  - [x] `src/app/(site)/calendario/page.tsx`
  - [x] `src/app/(site)/resultados/page.tsx`
  - [x] `src/app/(site)/resultados/[slug]/page.tsx`
  - [x] `src/components/layout/site-footer.tsx` e `src/components/events/event-card.tsx` (usam `getCategory` / `hasResults`)
- [x] **5.7** Componentes **cliente** que hoje importam mocks: passar os dados por *props* a partir da página (o cliente não pode chamar o Prisma): — ✅ 2026-10-20
  - [x] `components/events/events-explorer.tsx` (recebe a lista de eventos, categorias e províncias)
  - [x] `components/calendar/event-calendar.tsx`
  - [x] `components/home/hero-search.tsx` (recebe categorias)
  - [x] `components/results/results-directory.tsx`
  - [x] `components/events/registration-wizard.tsx` (províncias) — o resto na Fase 7
- [x] **5.8** Tornar as páginas com dados **dinâmicas** (D4): retirar `generateStaticParams` e garantir que cada pedido lê a BD (ver nos docs do Next 16 a forma recomendada, ex.: `await connection()`). Um evento novo aparece logo ao recarregar a página. — ✅ 2026-10-20 (todas as páginas públicas aparecem como `ƒ` no build; testado: alterar um banner na BD aparece ao recarregar)
- [x] **5.9** Criar `loading.tsx` e `error.tsx` nas rotas com dados (`/eventos`, `/eventos/[slug]`, `/resultados/[slug]`, `/calendario`). — ✅ 2026-10-20 (um `loading.tsx` e um `error.tsx` em `app/(site)/`, que cobrem todas as páginas públicas)
  > ℹ️ Com o ecrã de carregamento (streaming), uma página inexistente (ex.: `/eventos/nao-existe`) mostra "não encontrado" mas responde **200** em vez de 404. O Next injecta `noindex`, por isso os motores de pesquisa não a indexam. É o comportamento documentado do Next 16; manteve-se, porque o ecrã de carregamento é mais importante em redes móveis lentas.
- [x] **5.10** Paginação no servidor para inscritos e resultados (hoje vem tudo de uma vez). — ✅ 2026-10-20 (páginas de 25 com filtros no URL: `/resultados/[slug]`, `/eventos/[slug]/inscritos` e "Procurar o meu resultado" em `/resultados`; pesquisa sem acentos com `public.search_norm` — migração `pesquisa_sem_acentos`, extensão `unaccent`; CSV gerado no servidor em `/api/resultados/[slug]/csv`; testado com 2000 resultados: cada página tem ~200 KB e 25 linhas. O **painel** de gestão continua a carregar todos os dados dos eventos do utilizador — ver 12.10)
  > ⏸️ Adiado: com os volumes actuais (~100 inscritos e ~100 resultados por evento) não é preciso. Fazer antes do primeiro evento grande (milhares de inscritos), incluindo a pesquisa "Procurar o meu resultado" (`listResultIndex` envia hoje todos os resultados para o browser).
- [x] **5.11** Lista de províncias: manter como constante em código (não muda) — mover para `src/lib/constants.ts`. — ✅ 2026-10-20 (`src/lib/constants.ts`)
- [x] **5.12** Quando nenhuma página pública importar `@/lib/data`: mover os mocks para `prisma/seed-data/` (só o seed os usa) e apagar `src/lib/data/`. — ✅ 2026-10-20 (mocks em `prisma/seed-data/`; gerador de percursos em `src/lib/route-helpers.ts`; nenhum ficheiro de `src/` importa dados de demonstração)
- [x] **5.13** `npm run build` sem erros e testar todas as páginas públicas. — ✅ 2026-10-20 (build OK; testes no browser em produção: inscrição, perfil, admin, calendário, resultados, telemóvel — sem erros na consola)

---

## Fase 6 — Autenticação real (Supabase Auth) ✅

> Ler antes: `node_modules/next/dist/docs/01-app/02-guides/authentication.md` e `01-getting-started/16-proxy.md`.
> ⚠️ No Next 16 o antigo `middleware.ts` chama-se **`proxy.ts`** e exporta uma função `proxy`.

- [x] **6.0** ⚠️ **Actualizar o Node.js para a versão 22 LTS (ou mais recente)** em todas as máquinas e no alojamento. O `@supabase/supabase-js` actual não funciona em Node 20 (falta o WebSocket nativo), e o Node 20 já está fora de suporte. Acrescentar `"engines": { "node": ">=22" }` ao `package.json` e um `.nvmrc` com `22`. — ✅ 2026-10-20 (Node 22.23.3; `.nvmrc` e `engines` adicionados)
- [x] **6.1** Instalar: `npm i @supabase/supabase-js @supabase/ssr` — ✅ 2026-10-20 (`@supabase/supabase-js` 2.118, `@supabase/ssr` 0.12)
- [x] **6.2** Criar os clientes Supabase: — ✅ 2026-10-20
  - [x] `src/lib/supabase/client.ts` → `createBrowserClient(url, publishableKey)`
  - [x] `src/lib/supabase/server.ts` → `createServerClient` com `await cookies()` (`getAll` / `setAll`)
  - [x] `src/lib/supabase/admin.ts` → cliente com `SUPABASE_SECRET_KEY` (**só servidor**, para criar ou eliminar utilizadores no admin)
- [x] **6.3** Criar `src/proxy.ts`, que renova a sessão em cada pedido (padrão `updateSession` do `@supabase/ssr`) e faz redireccionamentos optimistas: `/perfil/*` sem sessão → `/entrar?next=…`. — ✅ 2026-10-20 (usa `getClaims()` e aplica os cabeçalhos anti-cache que o `@supabase/ssr` envia com os cookies)
  > ⚠️ O `proxy` serve só para *redirecionar*. A verificação real de permissões faz-se no servidor (6.5).
- [x] **6.4** Configurar no painel do Supabase → **Authentication** (👤 feito pelo responsável do projecto): — ✅ 2026-10-20 (falta só traduzir os modelos de e-mail, ver abaixo)
  - [x] Fornecedores: só **Email** activo (desactivar Phone e outros) — ✅ verificado 2026-10-20 (Email activo, Phone desligado)
  - [x] Site URL e Redirect URLs (`http://localhost:3000/**`; o domínio de produção na Fase 12) — ✅ 2026-10-20 (`http://localhost:3000` + `http://localhost:3000/**`; testado com um link de recuperação)
  - [ ] Modelos de e-mail **em português** (confirmação, recuperação de senha, mudança de e-mail)
    > 👤 Por fazer no painel (**Authentication → Emails → Reset Password**). Usar o formato `token_hash`, que funciona mesmo que a pessoa abra o e-mail noutro browser ou na app de e-mail do telemóvel (o modelo padrão, `{{ .ConfirmationURL }}`, só funciona no mesmo browser onde pediu a recuperação). Testado em 2026-10-20.
    > - Assunto: `Redefinir a sua palavra-passe — AeroTiming`
    > - Corpo:
    >   ```html
    >   <h2>Redefinir palavra-passe</h2>
    >   <p>Olá! Recebemos um pedido para criar uma nova palavra-passe para a sua conta AeroTiming.</p>
    >   <p><a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=recovery&next=/nova-palavra-passe">Redefinir palavra-passe</a></p>
    >   <p>Se não foi você que pediu, ignore este e-mail — a sua palavra-passe não muda.</p>
    >   ```
    > - Quando a confirmação de e-mail for ligada (produção), fazer o mesmo em **Confirm signup** com `type=email&next=/perfil`.
  - [x] Em **dev**, desactivar "Confirm email" (o SMTP incluído no Supabase só envia poucos e-mails por hora). Em produção volta a ser obrigatório, com SMTP próprio (12.9) — ✅ 2026-10-20 (verificado: contas novas ficam activas logo)
- [x] **6.5** Criar `src/server/auth.ts` com: — ✅ 2026-10-20 (`getClaims()` em vez de `getUser()`, como recomenda a versão actual; também `canAccessPanel`, `hasRole`, `requireAdminPage`)
  - `getCurrentUser()` → `supabase.auth.getUser()` + `Profile` do Prisma (ou `null`)
  - `requireUser()` → redirecciona para `/entrar` se não houver sessão
  - `requireRole("admin" | "organizador")` → mostra "Acesso restrito" ou `notFound()`
  > ⚠️ No servidor use sempre `getUser()` (valida o token no Supabase), não `getSession()`.
- [x] **6.6** Server Actions de autenticação em `src/server/actions/auth.ts` (com validação `zod`): — ✅ 2026-10-20 (`src/server/actions/auth.ts` + rota `src/app/auth/callback/route.ts` + página `/nova-palavra-passe`)
  - [x] `signIn` (e-mail + palavra-passe)
  - [x] `signUp` (nome, e-mail, palavra-passe; o `name` vai em `options.data` para o trigger da tarefa 4.2)
  - [x] `signOut`
  - [x] `requestPasswordReset` + rota `/auth/callback` (troca o código por sessão) + página de nova palavra-passe
  - [x] `updatePassword`
- [x] **6.7** Ligar os formulários existentes às actions (manter o visual): — ✅ 2026-10-20
  - [x] `components/auth/login-form.tsx` — só e-mail + palavra-passe (retirar "e-mail ou telemóvel" e a caixa "Contas de demonstração")
  - [x] `components/auth/register-form.tsx` — **um só passo**: nome, e-mail, palavra-passe e aceitar os termos. Retirar o passo 2 e o campo de telemóvel (passam para a 1.ª inscrição, 7.3)
  - [x] `components/auth/recover-form.tsx` — só por e-mail (retirar o código por SMS)
- [x] **6.8** Substituir `components/auth/auth-provider.tsx`: o layout raiz lê o utilizador no servidor e passa-o ao provider. O `useAuth()` mantém a mesma interface para não partir os componentes. Ouvir `onAuthStateChange` no cliente para actualizar o cabeçalho. — ✅ 2026-10-20 — sem `onAuthStateChange`: depois de entrar/sair, as Server Actions mudam os cookies e `router.refresh()` volta a ler o utilizador no servidor (mais simples e sem pedidos extra quando a janela ganha foco)
- [x] **6.9** Proteger as áreas no servidor (ver a secção *Utilizadores, papéis e permissões*): — ✅ 2026-10-20
  - [x] `app/(site)/perfil/layout.tsx` → `requireUser()` (retirar a guarda cliente do `profile-shell.tsx`)
  - [x] `app/admin/layout.tsx` → admin, organizador ou staff; o menu lateral mostra só as áreas do papel — admin e organizador; páginas só de admin (utilizadores, banners, patrocinadores, categorias, definições) redireccionam o organizador. ⚠️ O acesso do **staff** fica para a tarefa 7.6 (check-in); até lá o staff não entra no painel
  - [x] `src/server/permissions.ts` → `canManageEvent(user, eventId)` (admin, ou organizador em `event_staff`) e `canCheckIn(user, eventId)` (inclui staff). Todas as queries e actions do painel filtram por isto — ✅ 2026-10-20 (Fases 7–9)
  - [x] Botão "Painel de gestão" no menu da conta e no Resumo do perfil para organizador, staff e admin
- [x] **6.10** Confirmar que o admin master (seed, 4.4) entra e vê o painel completo; que o organizador de teste vê só os seus eventos; que o atleta de teste não entra em `/admin`. — ✅ 2026-10-20 (testado no browser: admin vê tudo; organizador sem Utilizadores/Banners/…; atleta recebe "Acesso restrito")
- [ ] ❌ **6.11** ~~Login / recuperação por SMS (OTP)~~ — descartado: login só por e-mail e palavra-passe (D2).
- [x] **6.12** Perfil real: `personal-data-form.tsx` e `security-settings.tsx` gravam via Server Actions; "Apagar conta" usa o cliente admin (6.2) e **anonimiza** as inscrições antigas em vez de as apagar (os resultados históricos mantêm-se). — ✅ 2026-10-20 (`src/server/actions/profile.ts`: dados pessoais, notificações na BD, mudar palavra-passe com verificação da actual, apagar conta — cancela inscrições futuras e devolve as vagas; o último admin não se pode apagar)
- [x] **6.13** Testar: criar conta → entrar → sair → recuperar palavra-passe → aceder a `/admin` sem permissão (deve bloquear). — ✅ 2026-10-20 (8 testes automáticos no browser + triggers verificados na BD; a recuperação por e-mail não foi enviada de verdade — ver nota 6.4)

---
- [ ] **6.14** Mudar o e-mail da conta: por agora o campo está bloqueado em "Os meus dados" ("fale connosco"). Implementar com `supabase.auth.updateUser({ email })`, que envia confirmação para o novo endereço; o trigger já sincroniza `profiles.email`.

> ⚠️ **E-mails do Supabase em desenvolvimento:** o SMTP incluído no Supabase **só envia para os e-mails da equipa do projecto** e poucos por hora. Por isso, com "Confirm email" ligado, quem cria conta com outro e-mail não recebe a confirmação e não consegue entrar. Recomendação (6.4): **desligar "Confirm email" em dev**. Em produção, ligar com SMTP próprio (12.9).

---

## Fase 7 — Inscrições reais ✅

- [x] **7.1** Server Action `createRegistration` em `src/server/actions/registrations.ts`: — ✅ 2026-10-20 (`src/server/actions/registrations.ts` + `src/server/registrations.ts`; vagas com `UPDATE … WHERE slots_taken < total_slots` e código com `INSERT … ON CONFLICT … RETURNING`. Testado: 8 pedidos simultâneos para 3 vagas → só 3 entram)
  - validar com `zod` (os mesmos campos e mensagens do `registration-wizard.tsx`)
  - confirmar no servidor: evento aberto, prazo de inscrição, vagas, idade mínima, preço da fase actual (**nunca confiar no preço enviado pelo browser**)
  - em **transacção** (`prisma.$transaction`): verificar e incrementar `slotsTaken` de forma atómica (`updateMany … where slotsTaken < totalSlots`), criar a `Registration` e o `Payment`
  - gerar o `code` único com o `Counter` (`update counters set value = value + 1 where key = 'registration:2026' returning value` → `AT-2026-00001`)
  - calcular o `ageGroup` a partir da data de nascimento e do dia da prova
- [x] **7.2** Atribuição do **dorsal** só quando o pagamento é confirmado: incremento atómico de `event_distances.next_bib` dentro da mesma transacção da confirmação (sem repetir: `@@unique([eventId, bib])`). — ✅ 2026-10-20 (`assignBib()` pronto e testado; será chamado na confirmação do pagamento, 8.5)
- [x] **7.3** Ligar o `registration-wizard.tsx` à action (estado de envio, erros do servidor, ecrã de confirmação com os dados reais). Na **primeira inscrição** pede telemóvel, BI, data de nascimento, t-shirt e contacto de emergência e guarda-os no perfil; nas seguintes vêm preenchidos (o atleta só confirma). — ✅ 2026-10-20 (pré-preenchido com o perfil; escolha **"Para mim / Para outra pessoa"**: só "Para mim" grava os dados no perfil — ex.: inscrever um filho não substitui os dados do pai)
- [x] **7.4** **Inscrição exige conta** (D6): sem sessão, "Inscrever-me" leva a uma página simples *Criar conta / Entrar* e, depois, volta automaticamente à inscrição (`?next=`). Retirar do wizard o caminho de convidado. — ✅ 2026-10-20 (ecrã "Para se inscrever precisa de uma conta" com Criar conta / Já tenho conta; aviso se já tiver inscrição no evento)
- [x] **7.5** Perfil → Inscrições: `registrations-list.tsx` e `profile-overview.tsx` lêem do servidor; "Cancelar inscrição" passa a ser uma action (devolve a vaga, `cancelledAt`). — ✅ 2026-10-20 (`src/server/queries/profile.ts`; cancelar devolve a vaga; "Como pagar" com as contas reais)
- [x] **7.6** Bilhete com QR: o código QR contém o `code` da inscrição. Criar a página `/admin/checkin`, onde a equipa do levantamento do kit lê o QR e marca "Kit levantado". — ✅ 2026-10-20 — ⚠️ ficou em **`/checkin`** (página própria, pensada para telemóvel) e não em `/admin/checkin`, para o staff não precisar de acesso ao painel. Lê o QR com a câmara (BarcodeDetector: Chrome Android/Safari recente) ou o código/dorsal à mão; só entrega se o pagamento estiver confirmado; regista quem entregou (`audit_logs`). Acesso: admin + equipa do evento (`src/server/permissions.ts`)
- [x] **7.7** Tarefa agendada que **expira** as inscrições com pagamento `pendente` (sem comprovativo) após um prazo configurável (ex.: 72 h) e liberta as vagas. Nunca expirar pagamentos `em_analise`, que aguardam o admin (Supabase Cron / `pg_cron`, ou um Cron do alojamento a chamar uma rota protegida). — ✅ 2026-10-20 (`expireStaleRegistrations()` corre antes de cada inscrição e na rota `GET /api/cron/expirar-inscricoes`, protegida com `CRON_SECRET`; `vercel.json` agenda-a 1× por dia — o plano gratuito da Vercel só permite diário. ℹ️ Na primeira execução expiraram 61 inscrições de demonstração cujo prazo já tinha passado)
- [x] **7.8** Botão "Avisem-me quando abrir" grava um `EventAlert`. — ✅ 2026-10-20 (grava em `event_alerts`; o envio do aviso chega com a Fase 11)
- [x] **7.9** Proteção contra abuso (anti-bot, limite de tentativas) — ✅ 2026-10-20 (só limite de tentativas, sem captcha: `src/server/rate-limit.ts` + tabela `rate_limits` — login 10/15 min por e-mail e 30/15 min por IP; criar conta 5/h por IP; recuperar palavra-passe 3/h por e-mail e 10/h por IP; mudar palavra-passe 5/15 min; inscrição 10/h por conta e 30/h por IP; contacto 10/h por IP. Contadores atómicos na BD; a tarefa agendada apaga os antigos. ⚠️ O IP vem de `x-forwarded-for`: só é fiável atrás do Vercel/proxy)
---
- [x] **7.10** Testes automáticos da lógica de inscrições: `npm run test:registrations` (vagas em simultâneo, códigos únicos, dorsal, expiração) — ✅ 2026-10-20

---

## Fase 8 — Pagamentos com confirmação manual (admin / organizador) ✅

> **Decisões D1, D10 e D12 (2026-10-20):** não há pagamento automático **nem envio de comprovativo pelo site**. O atleta paga fora do site e **envia a foto do comprovativo pelo WhatsApp do organizador**; o **admin ou o organizador do evento confirma** no painel.
>
> **Métodos aceites:** Multicaixa Express · Transferência bancária (IBAN) · Depósito bancário · KWiK
>
> **Fluxo:** inscrição → `pendente` (vaga reservada, prazo a contar) → atleta paga e envia o comprovativo pelo WhatsApp → organizador marca *"Recebi o comprovativo"* (`em_analise`, o prazo pára) → **Confirmar** (`confirmado` → inscrição `confirmada` + dorsal) ou **Rejeitar** com motivo (`rejeitado`, novo prazo para pagar de novo).

- [x] **8.1** Contas de recebimento **por evento** (`Event.paymentAccounts`) com as da AeroTiming como alternativa (`site_settings` → `payment_accounts`): IBAN(s), Multicaixa Express, KWiK, instruções de depósito, **WhatsApp para comprovativos** e prazo em horas. Editáveis em **`/admin/pagamentos/contas`** (admin: contas da AeroTiming e de todos os eventos; organizador: só os seus eventos). — ✅ 2026-10-20 (⚠️ as contas da AeroTiming gravadas pelo seed são **fictícias** — substituir pelas reais)
- [x] **8.2** Criar o pagamento `pendente` na inscrição, com `reference` = código e prazo das contas do evento. — ✅ 2026-10-20 (dentro de `createRegistration`)
- [x] **8.3** Ecrã **"Como pagar"** (fim da inscrição e perfil): valor, conta, código para o descritivo, botões "Copiar" e botão **"Enviar comprovativo pelo WhatsApp"** com mensagem pré-preenchida com o código. — ✅ 2026-10-20 (`src/components/payments/payment-instructions.tsx`)
- [x] ❌ **8.4** ~~Envio do comprovativo pelo site (upload)~~ — **descartado (D12)**: o comprovativo vai pelo WhatsApp do organizador. As colunas `proof_url`/`proof_hash` ficam sem uso.
- [x] **8.5** Painel → **Pagamentos** (`/admin/pagamentos`): separadores *Por confirmar / Rejeitados / Confirmados / Todos*, filtro por evento, pesquisa por código, nome, telemóvel ou dorsal; botões **Confirmar** (com nº da operação opcional), **Recebi o comprovativo**, **Rejeitar** (motivo obrigatório) e **Falar com o atleta** (WhatsApp). Confirmar é uma transacção com update condicional (testado: duas pessoas a confirmar ao mesmo tempo → só uma confirma) e atribui o dorsal (7.2). Se a inscrição já tinha expirado e ainda houver vaga, volta a ocupá-la. Tudo fica em `audit_logs`. — ✅ 2026-10-20
- [x] **8.6** Detecção de comprovativo repetido pelo **nº da operação** (`transactionRef`): aviso com o código da inscrição onde já foi usado e opção "Confirmar mesmo assim". — ✅ 2026-10-20
- [x] **8.7** Pagamento registado pelo admin/organizador para quem pagou presencialmente ou enviou por WhatsApp. — ✅ 2026-10-20 (é o próprio "Confirmar" do 8.5 — não é preciso anexar nada)
- [x] **8.8** Exportação **CSV** dos pagamentos de um evento (código, atleta, telemóvel, distância, dorsal, método, valor, estado, nº operação, data de confirmação), para conferir com o extracto bancário. Os contadores por estado aparecem nos separadores. — ✅ 2026-10-20
  - [ ] Totais em Kz por método e por estado no topo da página (opcional).
- [x] **8.9** Adaptar o frontend (que simulava pagamento automático e "Referência Multicaixa"): — ✅ 2026-10-20 (último ponto fechado na Fase 9)
  - [x] `src/lib/types.ts` / `src/lib/format.ts` → 4 métodos manuais e estados do pagamento — ✅ 2026-10-20
  - [x] Assistente de inscrição → 4 métodos, ecrã final com instruções e botão WhatsApp — ✅ 2026-10-20
  - [x] Perfil (`registrations-list.tsx`, `profile-overview.tsx`) → "Como pagar", estado do pagamento e motivo da rejeição — ✅ 2026-10-20
  - [x] Textos: FAQ de pagamentos, termos, regulamento-base (e os 12 regulamentos já gravados na BD), "Como funciona" da Home e da Ajuda, nota de preços na página do evento — ✅ 2026-10-20
  - [x] `components/admin/registrations-manager.tsx` (página **Inscrições** do painel) ainda usa dados mock e tem um "Confirmar pagamento" falso → passa para a BD na **Fase 9**; até lá, usar **Pagamentos**. — ✅ 2026-10-20 (Fase 9: dados reais e "Confirmar pagamento" real, com dorsal) As definições de pagamento do `settings-form.tsx` foram substituídas por `/admin/pagamentos/contas`.
- [x] **8.10** Testes ponta a ponta no browser: inscrição → botão WhatsApp com o número certo; "Recebi o comprovativo"; confirmação dupla em simultâneo; comprovativo repetido; rejeição com motivo visível para o atleta; organizador só vê os seus eventos; WhatsApp próprio do evento; exportação CSV pelo admin. — ✅ 2026-10-20

### Futuro — pagamento automático (não fazer agora)

Fica registado para quando se decidir integrar um gateway angolano (referência Multicaixa com confirmação automática, pedido de pagamento Multicaixa Express, etc.). O schema já tem os campos `provider`, `providerRef` e `rawPayload` reservados.

- [ ] **8F.1** Escolher o gateway e obter as credenciais de teste (sandbox).
- [ ] **8F.2** `src/server/payments/<gateway>.ts` com a mesma interface do pagamento manual.
- [ ] **8F.3** Webhook `src/app/api/pagamentos/webhook/route.ts`: validar a assinatura, ser **idempotente** (`providerRef`) e guardar o `rawPayload` → confirmar como em 8.5.
- [ ] **8F.4** Reconciliação diária entre o gateway e a BD.
- [ ] **8F.5** Manter o pagamento manual como alternativa.

---

## Fase 9 — Admin real + upload de ficheiros ✅

- [x] **9.1** Criar *buckets* no Supabase Storage: — ✅ 2026-10-20 (um bucket público **`media`**, criado automaticamente no 1.º upload, com pastas `imagens/` e `documentos/`; comprovativos não são precisos — D12)
  - `cartazes`, `banners`, `patrocinadores` → **públicos** (só leitura)
  - `regulamentos`, `percursos` (PDF/GPX) → públicos
  - ~~`comprovativos`~~ → não é preciso (D12: comprovativos pelo WhatsApp)
- [x] **9.2** Upload feito no servidor (Server Action com o cliente admin) ou com URLs assinados de upload. Validar o tipo e o tamanho (ex.: imagens ≤ 5 MB, PDF ≤ 10 MB). — ✅ 2026-10-20 (`src/server/actions/uploads.ts`: imagens ≤ 5 MB, PDF/GPX ≤ 10 MB; só admin/organizador; `bodySizeLimit` 6 MB no `next.config.ts`)
- [x] **9.3** Acrescentar o domínio do Supabase Storage a `images.remotePatterns` no `next.config.ts`. — ✅ 2026-10-20
- [x] **9.4** Substituir `components/admin/admin-store.tsx` por Server Actions em `src/server/actions/admin/*`, cada uma a começar pela verificação de permissões (6.9) e a escrever no `AuditLog`: — ✅ 2026-10-20 — feito **sem reescrever as páginas**: o `admin-store.tsx` mantém a mesma interface, mas recebe os dados da BD (`src/server/queries/admin.ts`, filtrados por permissão) e grava tudo por uma única action, `src/server/actions/admin.ts` (com permissões e `audit_logs`). Gravar um evento completo demora ~4 s.
  - [x] Eventos — criar / editar / duplicar (organizador: os seus) · **pedir publicação** (organizador) · **publicar** (só admin, D11) · cancelar (eventos com inscrições não se apagam) · equipa do evento (`event_staff`) · contas de recebimento (8.1) — ✅ 2026-10-20
  - [x] Inscrições — kit levantado, editar dorsal, cancelar, exportar CSV (a confirmação de pagamentos está na tarefa 8.5) — ✅ 2026-10-20
  - [x] Utilizadores — promover a organizador / admin, activar / desactivar, ver pedidos "organizar" vindos do contacto — ✅ 2026-10-20
  - [x] Banners — CRUD + ordenar — ✅ 2026-10-20
  - [x] Patrocinadores — CRUD — ✅ 2026-10-20
  - [x] Categorias — editar — ✅ 2026-10-20
  - [x] Definições — gravar em `SiteSetting`; o rodapé e os contactos passam a ler daqui — ✅ 2026-10-20 (gravam em `site_settings` → `site`; o site lê daqui desde a 9.9)
- [x] **9.5** Painel (`dashboard.tsx`): calcular os indicadores com consultas agregadas (`groupBy`, `aggregate`). — ✅ 2026-10-20 (os indicadores são calculados a partir dos dados reais do evento/organizador; agregar no servidor só se o volume crescer)
- [ ] ❌ **9.6** ~~Revalidar páginas públicas após alterações~~ — não é preciso: as páginas são dinâmicas (D4).
- [ ] ⏸️ **9.7** Migrar as imagens de `public/images/` para os buckets e actualizar os URLs na BD. — adiado: as imagens de demonstração em `public/images/` continuam a funcionar; as novas já vão para o Storage.
- [x] **9.9** Rodapé, contactos e redes sociais do site lidos de `site_settings` (hoje estão no código). — ✅ 2026-10-20 (`getSiteSettings()` em `src/server/queries/site.ts`; rodapé, botão WhatsApp, Contacto, Ajuda e Sobre; redes em branco não aparecem; novo campo LinkedIn. As chaves antigas `contacts`/`social` do seed passaram para uma só chave `site`)
- [x] **9.8** Formulário de contacto (`contact-form.tsx`) grava em `ContactMessage` e cria a caixa de mensagens no admin. Os pedidos com assunto "organizar" aparecem destacados, com o botão "Promover a organizador". — ✅ 2026-10-20 (`src/server/actions/contact.ts`: validação no servidor, campo-armadilha para robôs, máx. 3 mensagens/10 min por e-mail; página `/admin/mensagens` só para admin; "Promover" usa a conta com o mesmo e-mail e regista no `audit_logs`)

---

## Fase 10 — Resultados reais ✅

- [x] **10.1** Importação de CSV no **servidor** (Server Action): validar as colunas, mostrar a pré-visualização e só gravar após confirmação. Ligar cada resultado à inscrição pelo dorsal. — ✅ 2026-10-20 (`previewResultsImport` + `importResults` em `src/server/actions/results.ts`: aceita `,`/`;`, cabeçalhos em inglês ou português, tempos `MM:SS`/`HH:MM:SS(.d)`; dados em falta vêm da inscrição; recusa dorsais repetidos ou já usados noutra distância; avisa dorsais sem inscrição ou inscritos noutra distância; substitui a distância numa transacção com `createMany` — 2000 linhas em ~6 s)
- [x] **10.2** Recalcular as classificações (geral, sexo, escalão) numa função única em `src/server/results.ts`. — ✅ 2026-10-20 (`recomputeRankings`: uma só instrução SQL com `row_number()`; corre em cada importação e em cada edição no painel — o botão "Recalcular" deixou de ser preciso)
- [x] **10.3** "Publicar resultados" altera `Event.resultsPublished`; as páginas públicas só mostram resultados publicados. — ✅ 2026-10-20 (já feito na Fase 9; testado)
- [x] **10.4** Perfil → Resultados liga-se pelo `registrationId` (não pelo nome, como no mock). — ✅ 2026-10-20 (já feito na Fase 9; testado com a conta de teste)
- [x] **10.5** Certificado em PDF gerado no servidor (opcional; hoje é `window.print()`). — ✅ 2026-10-20 (`GET /api/certificados/[id]` com `pdf-lib`, sem browser headless; A4 horizontal com tempo, posições geral/sexo/escalão, ritmo e link de verificação; só resultados publicados de quem terminou; botão "Descarregar PDF" na classificação e em Perfil → Resultados. Usa as fontes-padrão do PDF: letras fora do alfabeto latino são trocadas pela letra base)
- [ ] **10.6** *(Futuro)* Integração directa com o sistema de cronometragem (resultados ao vivo).

---

## Fase 11 — Notificações (SMS / e-mail) ⏸️

> ⏸️ **Adiada** (D3). Por agora o atleta acompanha tudo no perfil (estado da inscrição e do pagamento, motivo de rejeição, dorsal). Os únicos e-mails enviados são os do Supabase Auth (recuperar palavra-passe).

- [ ] **11.1** Escolher fornecedores de e-mail transaccional e de SMS com bom envio para números angolanos (D3).
- [ ] **11.2** Modelos de mensagem em português: inscrição registada + como pagar, comprovativo recebido, pagamento confirmado + dorsal, pagamento rejeitado (com motivo), lembrete do levantamento do kit, lembrete na véspera da prova, resultados publicados, inscrições abertas (`EventAlert`).
- [ ] **11.3** Envio fora do pedido do utilizador (fila ou tarefa agendada), com novas tentativas em caso de falha.
- [ ] **11.4** Respeitar as preferências do perfil (`notifySms`, `notifyEmail`, `notifyWhatsapp`).

---

## Fase 12 — Produção: deploy, segurança e monitorização

- [ ] **12.1** Criar o projecto Supabase de **produção** (`aerotiming-prod`), adiado da tarefa 1.2, e aplicar as migrações com `db:deploy`. Alojamento (o `.gitignore` já tem `.vercel`): configurar as variáveis de ambiente de produção e apontar para o projecto Supabase **prod**.
- [ ] **12.2** Pipeline de deploy: `prisma migrate deploy` antes do build (nunca `migrate dev` em produção).
- [ ] **12.3** Backups da BD (plano do Supabase com *Point-in-Time Recovery*, ou dumps diários) e um teste de restauro.
- [ ] **12.4** Revisão de segurança: RLS activo em todas as tabelas, nenhuma chave secreta no cliente, todas as Server Actions verificam permissões (incluindo o organizador só nos seus eventos).
- [ ] **12.5** Conformidade com a **Lei n.º 22/11** (Protecção de Dados Pessoais): consentimento, finalidade, prazo de conservação dos dados de saúde, exportar e apagar os dados a pedido.
- [ ] **12.6** Monitorização de erros (ex.: Sentry) e de desempenho; alertas quando houver pagamentos `em_analise` há mais de 24 h sem resposta do admin.
- [ ] **12.7** Retirar tudo o que é demonstração: caixa de contas demo, dados fictícios (patrocinadores, NIF, contactos), aviso "Este site é uma demonstração".
- [ ] **12.8** SEO: `sitemap.ts`, `robots.ts`, imagens Open Graph por evento. Corrigir as páginas "não encontrado" que respondem HTTP 200 em vez de 404 (efeito do `loading.tsx` no streaming).
- [ ] **12.9** SMTP próprio no Supabase Auth e "Confirm email" activo em produção (o SMTP incluído só serve para testes).
- [ ] **12.10** Painel de gestão: paginar no servidor as listas de inscrições e resultados (hoje `getAdminData` carrega tudo dos eventos do utilizador — pesado para o admin com muitos eventos grandes).

---

## Decisões

Regra do projecto: aplica-se sempre a **opção recomendada**, regista-se aqui com a data e avança-se. Só ficam em aberto (⏳) as que precisam de dados externos.

| # | Decisão | Opções / notas | Resposta |
|---|---|---|---|
| D1 | Gateway de pagamentos | Avaliar gateways angolanos que suportem Multicaixa Express e referências (ex.: ProxyPay, EMIS GPO via banco parceiro) | ✅ 2026-10-20: **por agora, pagamento manual** (Multicaixa Express, IBAN, depósito, KWiK + comprovativo; o admin confirma). Gateway automático no futuro (Fase 8 › Futuro). |
| D2 | E-mail obrigatório na conta? | Muitos utilizadores só têm telemóvel. Opções: e-mail obrigatório, ou login por telemóvel (OTP SMS) | ✅ 2026-10-20 (actualizada): **login só por e-mail + palavra-passe**, definidos ao criar conta. Sem SMS. O admin master não se regista: é criado pelo seed. |
| D3 | Fornecedores de SMS e e-mail | Testar a entrega em Unitel e Africell | ❌ 2026-10-20: descartado por agora — sem SMS nem e-mails de notificação (Fase 11 adiada). |
| D4 | Estratégia de cache | Páginas estáticas com revalidação após alterações no admin vs. renderização a pedido | ✅ 2026-10-20 (actualizada): **páginas sempre dinâmicas**, sem cache; o utilizador recarrega a página para ver os dados mais recentes. Mais simples: não há nada para invalidar. |
| D5 | Papel "organizador" | Vê só os seus eventos? Pode confirmar pagamentos? | ✅ 2026-10-20 (actualizada): o organizador gere **os seus eventos** (os que tem em `event_staff`): dados, inscrições, **pagamentos**, kits e resultados. Não publica sozinho (D11). O papel `staff` só faz check-in. |
| D6 | Inscrição sem conta | Permitir (menos fricção) ou exigir conta (mais controlo)? | ✅ 2026-10-20 (actualizada): **é preciso ter conta para se inscrever.** O registo pede só nome, e-mail e palavra-passe; os restantes dados são pedidos na 1.ª inscrição e reaproveitados. |
| D7 | Anti-bot | Cloudflare Turnstile, hCaptcha ou só limite de tentativas | ✅ 2026-10-20: só limite de tentativas (7.9). Captcha só se aparecer abuso real. |
| D8 | Escalões etários | Confirmar a tabela oficial com a Federação Angolana de Atletismo | ❌ 2026-10-20: descartado por agora — mantém-se a tabela de escalões actual (Júnior, Sénior, Veterano 35/45/55+), sem validação com a Federação. |
| D9 | Contas de recebimento | Uma conta única da AeroTiming para todos os eventos, ou contas diferentes por evento/organizador? (Por omissão: única, em `SiteSetting`) | ✅ 2026-10-20 (actualizada): **contas por evento** (`Event.paymentAccounts`, as do organizador), com as **contas da AeroTiming como alternativa** (`site_settings`). Motivo: como o organizador confirma pagamentos (D10), o dinheiro tem de entrar numa conta que ele consegue consultar. |
| D10 | Quem confirma pagamentos | Só o admin, ou também o organizador do evento? (ligado a D5) | ✅ 2026-10-20 (actualizada): **o admin e o organizador do evento** confirmam pagamentos. Fica registado quem confirmou (`confirmedById` + `audit_logs`). |
| D11 | Quem publica eventos | O organizador publica sozinho ou o admin aprova? | ✅ 2026-10-20 (recomendado): o organizador cria em rascunho e pede publicação; **o admin publica**. Evita eventos falsos a receber inscrições e dinheiro. |
| D12 | Envio do comprovativo | Pelo site (upload) ou fora do site? | ✅ 2026-10-20 (decidido pelo responsável): **pelo WhatsApp do organizador**, fora do site. O site mostra o botão "Enviar comprovativo pelo WhatsApp" com o código; o organizador confirma no painel. Upload descartado. |

---

## Referência rápida

### Comandos

```bash
npm run dev            # servidor de desenvolvimento
npm run db:migrate     # criar/aplicar migração (só em dev) — a seguir: npm run db:supabase
npm run db:deploy      # aplicar migrações (produção)
npm run db:seed        # inserir dados de exemplo
npm run db:studio      # ver/editar dados no browser
npm run db:check       # testar as ligações à BD (não mostra credenciais)
npm run test:registrations  # testes da lógica de inscrições (vagas, códigos, dorsais)
npm run db:supabase    # aplicar triggers do Auth + RLS (depois de cada migração)
npm run db:reset       # ⚠️ apaga tudo e volta a aplicar migrações + seed (só em dev)
npm run build          # build de produção
```

### Mock → Base de dados

| Mock (`src/lib/data`) | Tabela | Notas |
|---|---|---|
| `EVENTS` | `events` + `event_distances` + `price_tiers` + `event_routes` + `route_points` + `kit_pickups` + `schedule_items` + `regulation_sections` + `event_sponsors` | |
| `CATEGORIES` | `categories` | |
| `SPONSORS` | `sponsors` | |
| `BANNERS` | `banners` | |
| `PARTICIPANTS` + `REGISTRATIONS` | `registrations` + `payments` | Uma só tabela de inscrições |
| `RESULTS` | `results` | Tempos em ms |
| `USERS` | `auth.users` (Supabase) + `profiles` | Senhas geridas pelo Supabase |
| `PROVINCES` | constante em código | Não muda |
| Definições do admin | `site_settings` | |

### Estrutura de pastas nova

```
prisma/
  schema.prisma
  migrations/
  seed.ts
prisma.config.ts
src/
  generated/prisma/        (gerado — não versionar)
  lib/
    db.ts                  cliente Prisma
    supabase/              clientes Supabase (browser, server, admin)
    event-utils.ts         funções puras partilhadas
  server/
    auth.ts                getCurrentUser, requireUser, requireRole
    mappers.ts             Prisma → tipos da interface
    queries/               leituras (Server Components)
    actions/               escritas (Server Actions)
    payments/              integração com o gateway
  proxy.ts                 renovação da sessão
```

---

## Diário de alterações

| Data | Quem | O quê |
|---|---|---|
| 2026-10-20 | — | Guia criado. Fase 0 (frontend mock) concluída. |
| 2026-10-20 | — | Projecto Supabase criado (1.1). `.env.example` actualizado e `.env` local criado (1.5, 1.6). |
| 2026-10-20 | — | Fase 2 concluída: Prisma 7.10.1 + `@prisma/adapter-pg`, `prisma.config.ts` (CLI usa `DIRECT_URL`), `src/lib/db.ts` (app usa `DATABASE_URL`), scripts `db:*`. Acrescentado `scripts/db-check.ts` (`npm run db:check`). Ligações testadas com sucesso. |
| 2026-10-20 | — | Decisão: só ambiente de desenvolvimento por agora (1.2 → produção na 12.1). Fase 1 concluída. |
| 2026-10-20 | — | Decisão D1: pagamentos com **confirmação manual pelo admin** (Multicaixa Express, IBAN, depósito, KWiK). Fase 8 reescrita, schema `Payment` ajustado (estado `em_analise`, comprovativo); pagamento automático passa para "Futuro". |
| 2026-10-20 | — | Fase 3 concluída: schema revisto em `prisma/schema.prisma` (Timestamptz, índice parcial de inscrições activas, `EventStaff`, `Counter`, dorsais por distância, estados calculados). Decisões D2 e D4–D10 tomadas com a opção recomendada. Fase 4 ajustada: triggers do Auth e RLS em `prisma/sql/supabase-setup.sql` (fora das migrações, por causa da shadow database). |
| 2026-10-20 | — | Decisões revistas pelo responsável: login só e-mail/palavra-passe; admin master via seed; conta obrigatória para inscrição; páginas dinâmicas sem cache; organizador gere os seus eventos e confirma pagamentos; contas de recebimento por evento (`Event.paymentAccounts`); nova D11 (admin publica eventos). SMS/notificações (D3), escalões (D8) e anti-bot (D7) adiados ou descartados. Nova secção *Utilizadores, papéis e permissões*. |
| 2026-10-20 | — | Fase 4 concluída: tabelas criadas (migração `init`), triggers do Auth + RLS (`prisma/sql/supabase-setup.sql`, `npm run db:supabase`), seed com admin master e contas de teste. O seed usa a API REST do Auth em vez do `@supabase/supabase-js`, que exige Node 22 (nova tarefa 6.0). |
| 2026-10-20 | — | Tarefa 6.0: Node 22 instalado, `.nvmrc` + `engines` (`>=22`). Build, typecheck e ligações à BD verificados em Node 22. |
| 2026-10-20 | — | Fase 5 concluída: páginas públicas lêem do Supabase via `src/server/queries` + `src/server/mappers.ts`; páginas dinâmicas (`connection()`); `loading.tsx`/`error.tsx`; data de hoje real (Luanda). Corrigido: botão WhatsApp tapava o "Inscrever-me" no telemóvel. Paginação (5.10) adiada; remoção dos mocks (5.12) depois das Fases 6 e 9. |
| 2026-10-20 | — | Fase 6: login real com Supabase Auth (e-mail + palavra-passe), sessão em cookies via `src/proxy.ts`, utilizador lido no servidor (`getClaims`), registo num só passo, recuperação por link de e-mail, perfil e segurança gravam na BD, apagar conta. Protecção no servidor de `/perfil` e `/admin` (organizador sem áreas de admin). Contas de demonstração antigas retiradas do login. |
| 2026-10-20 | — | Fase 6 concluída: Site URL e Redirect URLs configuradas e "Confirm email" desligado em dev (feito pelo responsável). Fluxo de recuperação testado ponta a ponta com link `token_hash`; modelo de e-mail em português recomendado na 6.4. |
| 2026-10-20 | — | Fase 7 concluída: inscrição real (exige conta; validação e preço no servidor; vagas e códigos atómicos), "Para mim / Para outra pessoa", "As minhas inscrições" com dados reais e cancelamento, check-in de kits em `/checkin`, expiração automática (`/api/cron/expirar-inscricoes` + `CRON_SECRET`), alertas de abertura. Adiantado da Fase 8: 4 métodos manuais e instruções de pagamento (8.2, 8.3, parte da 8.9). |
| 2026-10-20 | — | Fase 8 concluída. Decisão D12: comprovativo pelo WhatsApp do organizador (sem upload). Página `/admin/pagamentos` (confirmar/rejeitar/"recebi o comprovativo"/CSV) e `/admin/pagamentos/contas` (contas e WhatsApp por evento ou da AeroTiming). Textos do site actualizados para pagamento manual. |
| 2026-10-20 | — | Fase 9: painel com dados reais (eventos, inscrições, resultados, utilizadores, banners, patrocinadores, categorias, definições) via `admin-store` + `adminMutate`; uploads para o Supabase Storage (bucket `media`); organizador só vê os seus eventos e cria em rascunho; mocks movidos para `prisma/seed-data/` (5.12). Testado: lista real, edição de evento reflectida no site, banner com imagem no Storage na Home. |
| 2026-10-20 | — | Fase 9 concluída: 9.8 caixa de mensagens do contacto (`/admin/mensagens`, promover a organizador) e 9.9 contactos/redes do site lidos de `site_settings`. Testado ponta a ponta (envio, validação, anti-robô, limite, promover, tratar/reabrir; alteração das Definições reflectida no site); dados de teste apagados. 9.7 continua adiada. |
| 2026-10-20 | — | Fase 10: importação de resultados validada no servidor com pré-visualização (10.1), classificações recalculadas no servidor em cada gravação (10.2); 10.3 e 10.4 confirmadas. Testado ponta a ponta (CSV com erros e avisos, ligação às inscrições, edição, publicação, perfil do atleta, 2000 linhas); dados de teste apagados. Falta 10.5 (certificado PDF, opcional). |
| 2026-10-20 | — | Fase 10 concluída: certificado de finisher em PDF gerado no servidor (10.5), `/api/certificados/[id]`. Testado: PDF de finisher, 404 para não-finisher/evento não publicado/id inexistente, nomes com letras não latinas. |
| 2026-10-20 | — | Fase 11 mantém-se adiada (decisão do responsável): segue-se a Fase 12. Revisão do guia antes da Fase 12: 8.9 fechada (já feita na Fase 9); 12.8 inclui corrigir o HTTP 200 nas páginas "não encontrado". |
| 2026-10-20 | — | 5.10 e 7.9 feitas antes da Fase 12 (pedido do responsável). Migrações novas: `pesquisa_sem_acentos` (extensão `unaccent` + `public.search_norm`) e `limite_tentativas` (tabela `rate_limits`, RLS ligado). Aplicadas com `migrate deploy` (o `migrate dev` não corre sem terminal interactivo). Nova tarefa 12.10 (paginação no painel). |
