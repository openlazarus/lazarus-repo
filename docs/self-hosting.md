# Self-Hosting Lazarus

This guide covers what you need to know if you want to run Lazarus yourself instead of using the hosted product.

## What's in this repo

This repository contains two packages:

- **`packages/lazarus-api`** — the agent runtime. Runs the Claude Agent SDK, MCP servers, agent triggers, inbox/email handling, and the WebSocket server. Each Lazarus workspace runs its own instance of this image.
- **`packages/lazarus-ui`** — the Next.js frontend.

Both are intended to be self-hostable.

## What's NOT in this repo

A small number of features in the hosted product depend on a separate, closed-source orchestrator service (workspace provisioning across multiple VMs, credit-based billing, Stripe integration). **None of these are required to self-host.** If you skip the orchestrator:

- You run a single `lazarus-api` instance for your workspace(s) instead of one VM per workspace.
- Billing/credit gating is disabled — you pay your own LLM provider directly via your `ANTHROPIC_API_KEY`.
- Workspace provisioning is manual rather than automatic.

The frontend talks to `lazarus-api` directly when no orchestrator URL is configured.

## Required configuration

Copy the `.env.example` files in each package and fill them in. The variables you'll most often need to change:

### `packages/lazarus-api/.env`

| Variable | What it does |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key. Required. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project. Required. |
| `STORAGE_BASE_PATH` | Where workspace data lives on disk. Defaults to `./storage`. Set to an absolute path for production (e.g. an attached EBS mount). |
| `EMAIL_DOMAIN` | The domain for agent inbox addresses (`{agent}@{slug}.{EMAIL_DOMAIN}`). Required only if you're using the email integration. Example: `mail.example.com`. |
| `CORS_ORIGINS` | Comma-separated list of allowed frontend origins. |

### `packages/lazarus-ui/.env`

| Variable | What it does |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase project. Required. |
| `NEXT_PUBLIC_LAZARUS_API_URL` | URL of your `lazarus-api` (the orchestrator's URL in the hosted product; for self-hosters, point at your single `lazarus-api` instance). |
| `NEXT_PUBLIC_WORKSPACE_API_URL` | Dev-only: full URL override for the per-workspace `lazarus-api`. |
| `NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN` | The base domain workspace subdomains hang off in production. |
| `NEXT_PUBLIC_EMAIL_DOMAIN` | Must match the backend `EMAIL_DOMAIN` so the UI displays the same agent email addresses the backend uses. |

## Database

Lazarus uses Supabase (Postgres + auth + RLS). You'll need a Supabase project (self-hosted or cloud) and the migrations under `packages/lazarus-api/supabase/migrations/` applied.

Some tables and RPC functions related to billing are intentionally not included in the public schema definition — they're only used by the closed-source orchestrator. You don't need to create them.

## Storage

`STORAGE_BASE_PATH` is the root for all workspace data. The structure is:

```
{STORAGE_BASE_PATH}/
└── workspaces/
    └── {workspaceId}/
        ├── .workspace.json
        ├── .agents/
        ├── .knowledge/
        ├── .mcp.config.json
        └── <user files>
```

Make sure the process running `lazarus-api` has read/write access to this path. In production, point this at a persistent volume.

## Email integration (optional)

If you want agents to send and receive email, you'll need:

- A domain you control (set as `EMAIL_DOMAIN`).
- An inbound email pipeline that posts to your `lazarus-api` `/api/email` endpoint. The hosted product uses AWS SES + a Lambda router; any equivalent works.
- An outbound provider. The codebase ships with an SES sender; swap it out if you use a different provider.

## Running

```bash
# In packages/lazarus-api
npm install
npm run build
npm start

# In packages/lazarus-ui
npm install
npm run dev    # or `npm run build && npm start` for production
```

A `Dockerfile` is provided in `packages/lazarus-api` for containerized deployment.

## What to ignore in this repo

A few files and directories exist for the maintainers' hosted CI/CD pipeline. They're harmless if you leave them, but you don't need them:

- `.github/workflows/` — public CI for tests/lint. Useful even for forks.

If you fork the repo and want a fully clean slate, delete anything that obviously refers to maintainer-specific infrastructure (the `lazarus-orchestrator` env vars, ECR image tags, etc.) — none of it gates self-hosted operation.

## Getting help

Open an issue on GitHub. For security reports, see `SECURITY.md`.
