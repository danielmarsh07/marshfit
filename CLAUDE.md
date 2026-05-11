# MarshFit — Guia para o Claude Code

## O que é este projeto

SaaS de gestão para academias, boxes de crossfit, hyrox, pilates, musculação, personal trainers e estúdios.
Cliente: Marsh Consultoria. Base técnica derivada do projeto NewTelemed (irmão deste).

Sistema multi-tenant: cada academia é um tenant isolado por `academiaId`.

**Stack:**
- API: Node.js 20 + Fastify 5 + TypeScript ESM puro + Prisma 6 + PostgreSQL
- Web (admin + aluno): React 19 + Vite + TailwindCSS + TanStack Query + Zustand
- Landing pública: Vite minimal (SEO-first, bundle separado)
- Monorepo: pnpm workspaces (`apps/api`, `apps/web`, `apps/landing`)
- Storage: S3-compatible (DigitalOcean Spaces) ou disco local em `apps/uploads/`

## Comandos essenciais

```bash
pnpm dev              # API (3334) + Web (5174) + Landing (5175) em paralelo
pnpm db:migrate       # Roda migrations Prisma
pnpm db:studio        # Abre Prisma Studio
pnpm db:seed          # Popula academia piloto + super admin
pnpm typecheck        # Roda tsc --noEmit em todos os apps
```

## Estrutura

```
apps/api/src/
  main.ts                         # Entry point Fastify, registro de plugins/rotas
  modules/
    auth/                         # Login, refresh, esqueci senha
    academias/                    # Registro público de academia (trial)
    leads/                        # Captura de interesse da landing
    health/                       # GET /health
    unidades/                     # CRUD de unidades/filiais
    modalidades/                  # CRUD de modalidades (Crossfit, Pilates…)
    salas/                        # CRUD de espaços físicos
    professores/                  # CRUD de coaches/instrutores
    planos/                       # CRUD de planos comerciais
    alunos/                       # CRUD de alunos
    matriculas/                   # Matrícula aluno↔plano + status
    aulas/                        # CRUD aulas + grade semanal
    treinos/                      # CRUD treinos / WODs reutilizáveis
    reservas/                     # Reservar/cancelar com lista de espera, lock anti-overbooking
    checkins/                     # Presença efetiva (admin/professor/recepção + auto-aluno)
    portal-aluno/                 # Endpoints do app do aluno (me, programação, reservas)
    (futuro)
    planos/ matriculas/ aulas/ reservas/ checkins/ treinos/
    financeiro/ dashboard/ avisos/ relatorios/ pagamentos/
  infra/
    database/prisma.ts            # Cliente Prisma + tenant extension
    storage/                      # S3 / disco local (Fase 2+)
  shared/
    plugins/auth.plugin.ts        # JWT verify + authorize(papel)
    plugins/tenant.plugin.ts      # Injeta request.tenant a partir do JWT
    plugins/error-handler.plugin.ts
    config/env.ts                 # Validação Zod de variáveis
    utils/errors.ts               # criarErro(status, msg)
    utils/permissions.ts          # Matriz papel x ação

apps/web/src/
  pages/
    auth/        # Login admin/aluno, esqueci senha, cadastro academia
    admin/       # Dashboard, Unidades, Modalidades, Salas, Planos, Alunos…
    professor/   # Aulas hoje, presença, check-in
    aluno/       # Programação, reserva, plano, pagamentos, treino
    shared/      # 404, ajuda
  components/
    layout/AppLayout.tsx          # Sidebar com menu por papel
  stores/
    auth.store.ts                 # JWT, refresh, academias do usuário, papel ativo
    theme.store.ts                # Tema (default | box)
  services/
    api.ts                        # Axios + interceptor de refresh
  styles/globals.css              # CSS variables por [data-theme]

apps/landing/src/
  Hero, Beneficios, Modulos, Planos, FAQ, Formulario, CTA
```

## Tenancy — regra de ouro

**Toda tabela de domínio TEM `academiaId Int` + `@@index([academiaId])`.**

O JWT do usuário carrega `academiaId` (e `unidadeId?`). O plugin `tenantPlugin` injeta `request.tenant = { academiaId, unidadeId, papel }`. A Prisma extension `prismaTenant` força `where: { academiaId }` em qualquer query nas tabelas tenant-scoped.

Se um service esquecer de passar `academiaId`, a extension aplica defensivamente.
Super Admin Marsh tem bypass via flag `request.tenant.bypass = true`.

**Nunca passar `academiaId` recebido do body do usuário.** Sempre derivar do JWT (`request.tenant.academiaId`).

## Autenticação

- JWT access token (15min) + refresh token (7d) em cookie HttpOnly.
- Payload: `{ sub, papel, academiaId, unidadeId?, alunoId?, professorId? }`.
- Plugin `app.authenticate` — só verifica token.
- Plugin `app.authorize(...papeis)` — verifica token + papel autorizado.
- Plugin `app.tenant` — injeta `request.tenant`.
- `request.user` e `request.tenant` disponíveis após auth.

## Papéis de acesso

| Papel | Pode |
|---|---|
| SUPER_ADMIN | Tudo (Marsh) |
| ADMIN_ACADEMIA | Gerir a academia toda (todas unidades) |
| GESTOR_UNIDADE | Gerir uma unidade específica |
| FINANCEIRO | Financeiro, contas, baixa de mensalidade |
| PROFESSOR | Aulas, presença, treino |
| RECEPCAO | Alunos, matrícula, reserva, check-in |
| ALUNO | Próprio perfil, plano, programação, reservas |

## Convenções de código

- ESM puro na API (imports com `.js` em TypeScript).
- Sem `any` — usar `unknown` ou tipos explícitos.
- Erros via `criarErro(status, mensagem)` em `shared/utils/errors.ts`.
- Componentes React em PascalCase, services em camelCase.
- Tailwind direto nas classes, sem CSS modules.
- Português em labels, mensagens de erro e comentários de negócio.

## Responsividade mobile (padrão herdado do NewTelemed)

- `<div className="hidden md:block">…tabela…</div>` + `<div className="md:hidden space-y-2">…cards…</div>`
- Card mobile inteiro é tap-navegável (`onClick={() => navigate(...)}` no outer div).
- Botões de ação dentro do card usam `onClick={e => e.stopPropagation()}`.
- Touch targets: `p-2.5 sm:p-1.5` (≥44px).
- Container: `p-4 sm:p-6`; grids `grid-cols-1 md:grid-cols-N` mobile-first.

## Changelog

A cada deploy que muda algo visível ao gestor da academia ou aluno:
1. Adicionar entrada no topo de `apps/web/src/changelog.ts`.
2. Bullets em linguagem de cliente.
3. `APP_VERSION` (sidebar + login) deriva de `CHANGELOG[0].version`.

## Fases do roadmap (status atual)

- ✅ Fase 0 — Diagnóstico e plano (`Prompts/01-arquitetura-e-plano-marshfit.md`)
- ✅ Fase 1 — Fundação (auth multi-tenant + layout + seed)
- ✅ Fase 2 — Landing pública + cadastro trial + lead capture
- ✅ Fase 3 — Cadastros principais (unidades, modalidades, salas, professores, planos, alunos, matrículas)
- ✅ Fase 4 — Aulas, grade semanal e treinos
- ✅ Fase 5 — Portal do aluno (programação, reserva, lista de espera, check-in)
- 🟡 Fase 6 — Financeiro (mensalidades, contas a pagar, baixa, inadimplência)
- ⬜ Fase 7 — Relatórios + ajustes piloto
- ⬜ Fase 8 — Pagamentos online
