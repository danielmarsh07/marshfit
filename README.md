# MarshFit

SaaS de gestão para academias, boxes, estúdios e personal trainers. Marsh Consultoria.

## Estrutura

```
app/
├── apps/
│   ├── api      — Fastify 5 + Prisma 6 + Postgres (porta 3334)
│   ├── web      — React 19 + Vite + Tailwind (porta 5174)  → admin + aluno
│   └── landing  — Vite + React (porta 5175)                → página comercial pública
├── prisma/      — schema, migrations e seed (dentro de apps/api)
└── docs/        — Prompts/01-arquitetura-e-plano-marshfit.md
```

## Pré-requisitos

- Node.js 20+
- pnpm 10+
- PostgreSQL 14+ (local ou Render)

## Setup inicial

```powershell
# 1. Variáveis de ambiente
Copy-Item .env.example .env
# Edite .env:
#   - DATABASE_URL com a string da sua nova instância no Render
#   - JWT_SECRET com pelo menos 32 caracteres aleatórios

# 2. Instalar dependências
pnpm install

# 3. Gerar Prisma client + criar schema no banco
pnpm db:generate
pnpm db:migrate         # cria as tabelas no DB (escolhe um nome p/ a migration)

# 4. Popular dados de teste
pnpm db:seed

# 5. Subir tudo em paralelo (API + Web + Landing)
pnpm dev
```

Após `pnpm dev`:
- API: http://localhost:3334/health
- Web (sistema): http://localhost:5174
- Landing: http://localhost:5175

## Credenciais de teste (após seed)

| Perfil | Email | Senha |
|---|---|---|
| Super Admin Marsh | admin@marshconsultoria.com.br | marsh@admin |
| Admin Box Piloto | admin@boxpiloto.com.br | piloto@admin |

## Scripts úteis

```bash
pnpm dev              # roda api + web + landing em paralelo
pnpm typecheck        # tsc --noEmit em todos os apps
pnpm build            # build de todos os apps
pnpm db:migrate       # aplica migrations Prisma
pnpm db:studio        # abre o Prisma Studio
pnpm db:seed          # popula academia piloto + admins de teste
```

## Próximos passos (roadmap)

Veja `Prompts/01-arquitetura-e-plano-marshfit.md` para o plano completo.

- ✅ **Fase 0** — Diagnóstico e plano
- 🟡 **Fase 1** — Fundação (em entrega agora)
- ⬜ **Fase 2** — Landing pública refinada + cadastro de academia trial
- ⬜ **Fase 3** — Cadastros principais
- ⬜ **Fase 4** — Aulas/turmas/treinos
- ⬜ **Fase 5** — Área do aluno
- ⬜ **Fase 6** — Financeiro
- ⬜ **Fase 7** — Relatórios + ajustes piloto
- ⬜ **Fase 8** — Pagamentos online

## Convenções

Resumidas em `CLAUDE.md`. Em uma linha: TypeScript ESM puro, sem `any`, queries tenant-scoped por `academiaId`, mobile-first, português em labels e mensagens.
