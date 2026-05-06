# Lazarus

Open source AI agent platform. Build, deploy, and manage AI agents with integrations for Slack, Discord, WhatsApp, email, and more.

## Monorepo Structure

```
packages/
  lazarus-api/    # Backend — Node.js/TypeScript, Express, Claude SDK
  lazarus-ui/     # Frontend — Next.js, React, TailwindCSS
```

## Prerequisites

- Node.js 20+
- npm
- [Supabase](https://supabase.com) account
- [Anthropic](https://console.anthropic.com) API key

## Setup

### 1. Clone and install git hooks

```bash
git clone https://github.com/openlazarus/lazarus.git
cd lazarus
./setup.sh
```

This installs [Lefthook](https://github.com/evilmartians/lefthook) for pre-commit hooks (lint + format per package). Works on macOS, Linux, and Windows (via Git Bash).

### 2. Install dependencies

```bash
cd packages/lazarus-api && npm install
cd ../lazarus-ui && npm install
```

### 3. Configure environment

Each package has a `.env.example` — copy and fill in your values:

```bash
cp packages/lazarus-api/.env.example packages/lazarus-api/.env
cp packages/lazarus-ui/.env.example packages/lazarus-ui/.env.local
```

See each package's README for required environment variables.

### 4. Start development

```bash
# Terminal 1 — Backend (port 8000)
cd packages/lazarus-api && npm run dev

# Terminal 2 — Frontend (port 3000)
cd packages/lazarus-ui && npm run dev
```

## Package READMEs

- [lazarus-api](packages/lazarus-api/README.md) — Backend setup, API routes, architecture
- [lazarus-ui](packages/lazarus-ui/README.md) — Frontend setup, components, scripts

## Pre-commit Hooks

Lefthook runs per-package lint-staged on commit. Only files in the affected package are checked.

- **API**: prettier + eslint on `*.ts`
- **UI**: eslint + prettier on `*.{js,jsx,ts,tsx,css,scss,md,json,html}`

## License

Apache License 2.0 — see [LICENSE](LICENSE)
