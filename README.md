# ConexãoSport — Portal de eventos desportivos (Angola)

Frontend em **Next.js 16 (App Router) + React 19 + Tailwind CSS 4 + TypeScript**.
Todos os dados são **mock** (não há backend ainda). O protótipo antigo (Vite) está guardado em `_prototipo-vite/` só para referência.

## Como correr

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # build de produção
npm run typecheck  # verificação de tipos
```

### Contas de demonstração
| Perfil | E-mail | Palavra-passe |
|---|---|---|
| Atleta | `carlos@exemplo.ao` | `123456` |
| Administrador | `admin@conexaosport.ao` | `admin123` |

A sessão é simulada e fica no `localStorage` do browser. A data de "hoje" está fixa em **14/10/2026** (`TODAY` em `src/lib/data/index.ts`) para os dados mock fazerem sentido.

## Páginas

| Rota | O que tem |
|---|---|
| `/` | Pesquisa (texto + província + modalidade), carrossel de destaques/publicidade/edições anteriores, eventos adicionados recentemente, modalidades, próximas provas, "como funciona", últimos resultados, patrocinadores |
| `/eventos` | Lista com filtros (modalidade, província, mês, estado), ordenação, vista grelha/lista; filtros guardados no URL |
| `/eventos/[slug]` | Cartaz (abre em ecrã inteiro com zoom e download), dados principais, distâncias e preços por fase, percurso (mapa + altimetria + pontos de apoio), kit e levantamento, programa, regulamento, inscritos, como chegar, patrocinadores, partilha WhatsApp/Facebook |
| `/eventos/[slug]/inscricao` | Inscrição em 4 passos (distância → dados → saúde → pagamento) com Multicaixa Express, referência Multicaixa ou transferência; confirmação, adicionar ao calendário (.ics) |
| `/eventos/[slug]/inscritos` | Lista pública de inscritos com estado do pagamento |
| `/calendario` | Calendário mensal + vista em lista, filtros |
| `/resultados`, `/resultados/[slug]` | Provas com resultados, pódio, classificação completa (sexo, escalão, tempos chip/oficial, ritmo, parciais), certificado imprimível, exportar CSV, inscritos |
| `/entrar`, `/criar-conta`, `/recuperar-senha` | Autenticação (simulada) |
| `/perfil/*` | Resumo, inscrições com bilhete QR e pagamento pendente, resultados e recordes pessoais, dados pessoais, segurança |
| `/admin/*` | Painel, eventos (criar/editar/duplicar/eliminar), inscrições (confirmar pagamento, kit), resultados (importar CSV, recalcular, publicar), utilizadores, banners do carrossel, patrocinadores, categorias, definições |
| `/sobre`, `/ajuda`, `/contacto`, `/termos`, `/privacidade` | Institucionais e FAQ |

## Estrutura

```
src/
  app/
    (site)/      páginas públicas (com cabeçalho, rodapé, barra inferior no telemóvel, botão WhatsApp)
    (auth)/      entrar / criar conta / recuperar palavra-passe
    admin/       painel de gestão (layout próprio)
  components/
    ui/          design system (Button, Badge, Field, Card, Modal, Tabs, Toast…)
    layout/      cabeçalho, rodapé, logótipo, navegação
    events/ home/ calendar/ results/ profile/ auth/ info/ admin/
  lib/
    types.ts     modelos de dados (contrato para o futuro backend)
    data/        dados mock + funções de consulta
    format.ts    datas, Kz, estados
public/images/   fotos, cartazes, logótipos de patrocinadores (fictícios)
```

## Ligar ao backend (próximo passo)

> 📋 O plano passo a passo, com a lista de tarefas e o progresso, está em **[GUIA_MIGRACAO.md](GUIA_MIGRACAO.md)**.

- As páginas públicas leem os dados através das funções de `src/lib/data/index.ts` (`getEvent`, `upcomingEvents`, `resultsOf`…). Substitua-as por chamadas à API mantendo os tipos de `src/lib/types.ts`.
- A autenticação está em `src/components/auth/auth-provider.tsx` (trocar por sessão real).
- O admin usa um store local (`src/components/admin/admin-store.tsx`, persistido em `localStorage`). As alterações feitas no admin **não** aparecem no site público até existir backend.
- Uploads (cartaz, logótipos, GPX, PDF) são só pré-visualização local.

## Notas
- Logótipos de patrocinadores, contactos, NIF e números da empresa são **fictícios** — substituir pelos reais.
- A loja ficou de fora, como combinado.
