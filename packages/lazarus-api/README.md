# Lazarus API

Backend for the Lazarus AI agent platform. Built with Node.js, TypeScript, Express, and the Claude Code SDK.

## Features

- AI agent execution with Claude Code SDK and MCP support
- Multi-channel messaging: Slack, Discord, WhatsApp, email
- Workspace-scoped agent management with triggers
- Real-time WebSocket updates
- Background task processing (inbox polling, trigger scheduling)
- MCP server management with presets and OAuth
- File management with SQLite tools

Billing/credits are not handled here. The orchestrator owns billing and pushes the per-workspace allowance to a shared Redis key (`credits:{workspaceId}`) that this API reads to gate execution; usage is reported back via the Redis stream `usage:events`.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

**Required variables:**

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Anthropic API key for Claude |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |

**Optional variables:**

| Variable | Description |
|----------|-------------|
| `API_PORT` | Server port (default: 8000) |
| `CORS_ORIGINS` | Allowed origins (comma-separated) |
| `ORCHESTRATOR_REDIS_URL` | Shared Redis used for credits + usage stream contract with the orchestrator |

See `.env.example` for the full list.

### 3. Start development

```bash
npm run dev
```

The server starts on `http://localhost:8000`. Health check: `GET /health`.

## Architecture

Domain-first structure. Each domain owns its controller, service, repository, and types.

```
src/
├── domains/           # Business domains
│   ├── agent/         # Agent CRUD + execution
│   ├── chat/          # Chat/conversation with agents
│   ├── discord/       # Discord bot integration
│   ├── email/         # Email routing (SES)
│   ├── file/          # File management
│   ├── mcp/           # MCP server management
│   ├── permission/    # Tool approval system
│   ├── slack/         # Slack bot integration
│   ├── team/          # Team management
│   ├── whatsapp/      # WhatsApp integration
│   ├── workspace/     # Workspace management
│   └── ...
├── routes/            # Express route wiring
├── middleware/         # Auth, error handling
├── infrastructure/    # Config, external services
├── realtime/          # WebSocket + event bus
├── background/        # Background services
├── tools/             # MCP tool servers
├── prompts/           # Agent system prompts
└── utils/             # Shared utilities
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |
| `npm run format:check` | Check formatting |
| `npm run typecheck` | TypeScript type check |
| `npm test` | Run tests |
