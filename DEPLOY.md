# MarshFit — Guia de instalação e deploy

Tudo o que você precisa para:
1. Rodar localmente
2. Subir para o GitHub
3. Publicar no Render

---

## 0. Pré-requisitos (instalar uma vez)

Confira no PowerShell (se já tem, pula):

```powershell
node --version    # precisa 20+
git --version     # qualquer recente
docker --version  # pro Postgres local (opcional)
```

Se faltar:
- **Node.js 20+** → https://nodejs.org/ (LTS)
- **Git** → https://git-scm.com/download/win
- **Docker Desktop** → https://www.docker.com/products/docker-desktop/ (opcional, só pro Postgres local)
- **pnpm** (via corepack que já vem com Node):
  ```powershell
  corepack enable
  corepack prepare pnpm@10.0.0 --activate
  pnpm --version
  ```

---

## 1. Rodar localmente

```powershell
cd "d:\Claude Code\marsh-consultoria\Academia Digital\app"

# 1.1 Banco de dados (escolha A ou B):

# Opção A — Docker (recomendado, mais fácil):
docker compose up -d
# (sobe um Postgres na porta 5432 em background)

# Opção B — Postgres instalado direto na máquina:
# crie um banco `marshfit` com user `marshfit` senha `marshfit`
# ou edite DATABASE_URL no .env para apontar pra sua instância.

# 1.2 Configurar variáveis:
Copy-Item .env.example .env
# Edite .env e gere um JWT_SECRET aleatório (32+ caracteres).
# No PowerShell você pode gerar com:
#   [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))

# 1.3 Instalar dependências:
pnpm install

# 1.4 Gerar Prisma client + criar tabelas + popular:
pnpm db:generate
pnpm db:migrate
# Quando perguntar o nome da migration: "init" (ou outro qualquer)
pnpm db:seed

# 1.5 Subir tudo em paralelo:
pnpm dev
```

Após `pnpm dev`, abra no navegador:

| Aplicação | URL |
|---|---|
| Landing pública | http://localhost:5175 |
| Sistema (admin + aluno) | http://localhost:5174 |
| API (health check) | http://localhost:3334/health |

**Credenciais (do seed):**
- Super Admin Marsh: `admin@marshconsultoria.com.br` / `marsh@admin`
- Admin Box Piloto: `admin@boxpiloto.com.br` / `piloto@admin`

### Fluxo de teste recomendado

1. `http://localhost:5175` — clica "Quero falar com a Marsh", testa o formulário.
2. `http://localhost:5174/login` — entra como `admin@boxpiloto.com.br`.
3. Cadastra: 1 modalidade (CrossFit), 1 sala, 1 professor, 1 plano, 1 aluno (com email!).
4. Abre o aluno, clica **Criar acesso**, copia os dados.
5. Em aba anônima, entra como o aluno → vê **Programação** → **Reservar** alguma aula.
6. Volta no admin → **Aulas hoje** → marca presença.

---

## 2. Subir para o GitHub

```powershell
cd "d:\Claude Code\marsh-consultoria\Academia Digital\app"

# Se ainda não tem repositório git nessa pasta:
git init
git add .
git status   # confere que .env NÃO está incluído (deve estar no .gitignore)
git commit -m "MarshFit: fases 0-5 entregues (fundação, landing, cadastros, aulas, portal aluno)"

# Crie o repositório vazio no GitHub:
#   https://github.com/new  → nome: marshfit  → Private → Create
# (não inicialize com README/license — vamos enviar o nosso)

# Conecte e empurre:
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/marshfit.git
git push -u origin main
```

> Se o `git push` pedir senha: use um **personal access token** do GitHub
> (https://github.com/settings/tokens) no lugar da senha.

---

## 3. Deploy no Render

### 3.1 Criar conta e conectar GitHub

1. https://render.com — Sign up (use o GitHub se quiser conectar direto)
2. Authorize Render no seu GitHub.

### 3.2 Aplicar o Blueprint

1. Painel do Render → **New +** → **Blueprint**
2. Escolha o repositório `marshfit`
3. Render lê o `render.yaml` automaticamente
4. Confirma o nome dos serviços (deixa o padrão: `marshfit-db`, `marshfit-api`, `marshfit-web`, `marshfit-landing`)
5. Clica **Apply** — começa a provisionar tudo

### 3.3 Esperar o primeiro deploy

Render vai:
- Criar o banco `marshfit-db` (~1 min)
- Buildar a API (~3-5 min) — inclui `prisma migrate deploy`
- Buildar o Web (~2 min)
- Buildar a Landing (~1 min)

A API vai falhar no primeiro start se as variáveis abaixo não estiverem definidas.
**Isso é esperado.** Vamos preencher logo agora.

### 3.4 Anotar os domínios

Depois do deploy, cada serviço terá um domínio tipo:
- `https://marshfit-api.onrender.com`
- `https://marshfit-web.onrender.com`
- `https://marshfit-landing.onrender.com`

(Pode ter um sufixo aleatório se o nome estiver tomado — anote os reais.)

### 3.5 Preencher as variáveis pendentes

No painel Render → cada serviço → **Environment**:

**marshfit-api** → adicione:
```
CORS_ORIGINS=https://marshfit-web.onrender.com,https://marshfit-landing.onrender.com
PORTAL_URL=https://marshfit-web.onrender.com
LANDING_URL=https://marshfit-landing.onrender.com
```

**marshfit-web** → adicione:
```
VITE_API_URL=https://marshfit-api.onrender.com
```

**marshfit-landing** → adicione:
```
VITE_API_URL=https://marshfit-api.onrender.com
VITE_PORTAL_URL=https://marshfit-web.onrender.com
```

> Após adicionar, clique **Manual Deploy → Deploy latest commit** em cada serviço (web e landing precisam rebuild para pegar as VITE_*).

### 3.6 Popular o banco com o seed

O `migrate` já roda no deploy via `preDeployCommand`. Pra rodar o seed,
abra um shell no serviço da API:

Render → **marshfit-api** → **Shell** → cole:

```bash
pnpm --filter api db:seed
```

Aparece a confirmação com as credenciais. Pronto — agora você consegue logar no `marshfit-web.onrender.com/login`.

---

## 4. Atualizações futuras

Sempre que você fizer mudanças e quiser publicar:

```powershell
git add .
git commit -m "descrição do que mudou"
git push
```

Render detecta o push e re-deploya tudo automaticamente.

---

## ❗ Limitações do plano free do Render

- **Postgres free**: 90 dias de vida. Migrar pro pago antes disso ou criar nova.
- **Web services free**: dormem após 15 min sem tráfego (primeira requisição leva 30s a 1min). Bom o suficiente pra testar com o piloto; em produção real, plano pago elimina o cold start.
- **Static sites (web/landing)**: sem cold start, free pra sempre.

---

## ❓ Troubleshooting comum

### "Não consegue logar — refresh token falha"
Confere se as URLs em `CORS_ORIGINS` (api) batem **exatamente** com os domínios do web/landing (com `https://` e sem barra final).

### "Cannot find module @prisma/client"
Rode `pnpm --filter api db:generate` localmente (e no shell do Render se for o caso).

### "Migration is in a failed state"
Render Shell → `pnpm --filter api exec prisma migrate resolve --rolled-back NOME_DA_MIGRATION` → push novo commit.

### Logs no Render
Cada serviço tem aba **Logs** com stdout em tempo real. Sempre olha aí primeiro.
