# Publi Legal

Sistema de gestão de publicidade legal para prefeituras e câmaras municipais.

**O que faz**: controla contratos de publicação em Diários Oficiais (DOU, DOE) e Jornais de Grande Circulação, com saldo automático de cm/contrato, kanban operacional de 13 etapas (da solicitação ao recebimento) e painel financeiro.

## Stack

- **Frontend**: Next.js 15 + TypeScript + Tailwind CSS 3.4 + Recharts + Lucide Icons
- **Backend**: Express + better-sqlite3 + JWT (cookie httpOnly) + Helmet + CORS + bcrypt
- **Monorepo**: pnpm workspaces

## Estrutura

```
publi-legal/
├── apps/
│   ├── api/         # Backend Express (porta 3101)
│   └── web/         # Frontend Next.js (porta 3000)
├── docs/            # Decisões de arquitetura
└── scripts/         # Smoke tests
```

## Quick start

```bash
# 1. Instalar deps
pnpm install

# 2. Rodar backend (porta 3101)
pnpm dev:api

# 3. Em outro terminal, rodar frontend (porta 3000)
pnpm dev:web

# 4. Acessar
# Landing:    http://localhost:3000
# Login:      http://localhost:3000/login
# Sistema:    http://localhost:3000/app/dashboard
```

## Credenciais demo (após seed)

| Papel | E-mail | Senha |
|---|---|---|
| Admin | `admin@publilegal.com.br` | `admin123` |
| Operacional | `operacional@publilegal.com.br` | `op123` |

## Documentação adicional

- `docs/DECISOES.md` — Decisões de arquitetura e mudanças significativas
