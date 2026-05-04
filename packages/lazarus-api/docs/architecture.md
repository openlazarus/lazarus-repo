# System Architecture

## Overview

Lazarus API is a TypeScript/Express backend running on port 8000 behind an AWS ALB. It provides workspace-scoped agent management, real-time communication via WebSockets, and background process orchestration.

**Entry point**: `src/index.ts` bootstraps the system in this order:

1. Load environment variables and initialize Sentry
2. Start Express server (`src/app.ts`) on configured port
3. Attach WebSocket server to the HTTP server
4. Start memory pressure monitor
5. Initialize and start background process manager (non-fatal on failure)
6. Start Discord bot if configured (non-fatal on failure)

Graceful shutdown is handled via SIGINT/SIGTERM, stopping Discord, background processes, and WebSocket connections.

---

## Directory Structure

```
src/
├── index.ts                  # Process entry point, startup + shutdown
├── app.ts                    # Express app factory, route registration, middleware
├── websocket.ts              # Legacy WebSocket setup (superseded by realtime/websocket/)
├── load-env.ts               # .env + .env.local loader
│
├── domains/                  # Business domains (see Domain Structure below)
│   ├── activity/
│   ├── agent/
│   ├── cache/
│   ├── chat/
│   ├── conversation/
│   ├── discord/
│   ├── email/
│   ├── execution/
│   ├── file/
│   ├── global-agent/
│   ├── integration/
│   ├── invitation/
│   ├── knowledge/
│   ├── mcp/
│   ├── permission/
│   ├── slack/
│   ├── sqlite/
│   ├── team/
│   ├── v0/
│   ├── whatsapp/
│   └── workspace/
│
├── routes/                   # Express route definitions (thin wiring layer)
├── middleware/                # Express middleware (auth, CORS, rate limit, etc.)
├── realtime/                 # WebSocket server, event bus, broadcasters, caching
├── background/               # Background services (triggers, cleanup, health)
├── infrastructure/           # External concerns (database config, Supabase client)
├── errors/                   # Custom error classes (HttpException hierarchy)
├── guardrails/               # Agent guardrail definitions and tool mappings
├── mcp/                      # MCP server implementations (inbox, tools)
├── tools/                    # MCP tool servers (sqlite, email, etc.)
├── prompts/                  # Agent system prompts loaded at runtime
├── shared/                   # Cross-cutting types and interfaces
├── utils/                    # Utility functions (logger, slug generator, etc.)
└── lambda/                   # Lambda function code (SES email processing)
```

---

## Domain-First Structure

Each domain owns its full vertical slice:

```
domains/{name}/
├── controller/       # HTTP request handlers (thin, no business logic)
├── service/          # Business logic and orchestration
├── repository/       # Data access (Supabase queries, filesystem I/O)
└── types/            # Domain-specific types, interfaces, schemas
```

| Layer | Responsibility | Depends On |
|-------|---------------|------------|
| Controller | Parse request, call service, format response | Service |
| Service | Business rules, orchestration, validation | Repository interfaces |
| Repository | Database queries, file I/O, external API calls | Infrastructure |
| Types | Domain models, DTOs, validation schemas | Nothing |

**Dependency rule**: Controllers -> Services -> Repositories -> Infrastructure. Never reverse.

---

## Request Flow

```
Client Request
  |
  v
Express Middleware Stack
  ├── jsonWithRawBody / urlencodedWithRawBody   (body parsing)
  ├── CORS (standard or API-key variant)
  ├── apiRateLimit (1000 req/min prod, 10000 dev)
  └── requestLogger (structured Pino logging)
  |
  v
Route Definition (src/routes/*.ts)
  ├── requireAuth()              (JWT validation)
  ├── requireWorkspaceAccess()   (role lookup)
  ├── validate(schema)           (Zod input validation)
  └── controller.method()
  |
  v
Controller (src/domains/{name}/controller/)
  └── Calls service method, returns response
  |
  v
Service (src/domains/{name}/service/)
  └── Business logic, calls repository
  |
  v
Repository (src/domains/{name}/repository/)
  └── Supabase query or filesystem operation
  |
  v
Response (JSON) or SSE stream
```

---

## Agent Execution Flow

Agent execution is the core workflow. It starts from a chat request or trigger and produces a streaming response via Claude SDK.

```
Trigger (chat, email, webhook, schedule, WhatsApp, Discord, Slack)
  |
  v
workspace-agent-executor.ts
  ├── Load agent config from filesystem (.agents/{id}/config.agent.json)
  ├── Register execution in ExecutionCache
  ├── Build system prompt (from prompts/ + agent config)
  ├── Spawn MCP servers (inbox, sqlite, custom tools)
  ├── Emit 'agent:started' event via EventBus
  |
  v
Claude SDK (Anthropic API)
  ├── Streaming conversation with tool use
  ├── PreToolUse hook (sandbox validation, permission checks)
  ├── Tool execution (MCP tools, built-in tools)
  ├── PostToolUse hook (activity logging)
  └── Streaming response back to client (SSE or stored result)
  |
  v
Completion
  ├── Emit 'agent:stopped' event
  ├── Update ExecutionCache (complete/fail)
  ├── Log activity
  └── Clean up MCP server processes
```

**Execution types**: `trigger`, `specialist`, `manual`, `session`

**Execution statuses**: `pending` -> `running` -> `awaiting_approval` -> `completed` | `failed` | `cancelled`

---

## Realtime Infrastructure

Located in `src/realtime/`. Provides WebSocket communication, event-driven broadcasting, and execution state tracking.

### Components

| Component | File | Purpose |
|-----------|------|---------|
| EventBus | `events/event-bus.ts` | Type-safe pub/sub (extends Node EventEmitter, max 100 listeners) |
| Event Types | `events/event-types.ts` | All event type definitions and payload interfaces |
| ConnectionManager | `websocket/connection-manager.ts` | WebSocket connection pool, scoped broadcasting, 30s heartbeat |
| WebSocket Server | `websocket/server.ts` | HTTP upgrade handling, endpoint routing |
| ExecutionCache | `cache/execution-cache.ts` | In-memory execution state tracking with fluent API |
| ActivityLogger | `activity/activity-logger.ts` | Disk/database activity logging |
| FileWatcher | `file-watcher/file-watcher.ts` | Chokidar-based workspace file watching |

### Broadcasters

Broadcasters subscribe to EventBus events and forward them as WebSocket messages via ConnectionManager.

| Broadcaster | Events Handled |
|-------------|---------------|
| AgentBroadcaster | `agent:started`, `agent:stopped`, `agent:progress`, `agent:error`, `agent:state-changed` |
| ExecutionBroadcaster | `execution:registered`, `execution:updated`, `execution:completed`, `execution:failed` |
| FileBroadcaster | `file:created`, `file:modified`, `file:deleted` |
| WorkspaceBroadcaster | `workspace:updated` |
| TeamBroadcaster | `team:updated`, `team:member-added`, `team:member-removed` |
| ApprovalBroadcaster | `approval:requested`, `approval:resolved` |

### Unified API

```typescript
import { realtime } from './realtime'

// Track execution
const tracker = realtime.trackExecution({ type: 'trigger', agentId, userId, workspaceId })
tracker.progress(50, 'Processing...').complete()

// Emit events
realtime.emit('agent:started', { agentId, userId, workspaceId, metadata })

// Log activity
await realtime.logActivity(activityLog)

// Watch workspace files
await realtime.watchWorkspace(workspaceId, userId)
```

---

## Background Services

Located in `src/background/`. Started automatically after the Express server boots. Failures are non-fatal.

### BackgroundProcessManager (`manager.ts`)

Singleton orchestrator that:

1. Loads all active workspaces from Supabase on startup
2. For each workspace, reads agent directories from filesystem
3. Initializes triggers for all agents via TriggerInitializationService
4. Runs periodic cleanup and health check timers
5. Attempts automatic recovery of failed workspaces

### Services

| Service | File | Purpose |
|---------|------|---------|
| TriggerInitializationService | `trigger-initialization.service.ts` | Loads and registers agent triggers (scheduled, email, webhook, etc.) |
| WorkspaceTaskRegistry | `workspace-task-registry.ts` | Manages per-workspace background task handles (timers, intervals) |

### Lifecycle

```
initialize() -> start() -> loadActiveWorkspaces() -> loadWorkspace(each) -> startTimers()
                                                          |
                                              triggerInitService.loadWorkspaceTriggers()
```

Health checks run periodically. If >50% of workspaces are failed, status is `unhealthy` and recovery is attempted.

---

## Route Registration

All routes are registered in `src/app.ts`. Key route groups:

| Prefix | Router | Auth | Purpose |
|--------|--------|------|---------|
| `/health` | inline | None | ALB health check |
| `/api/chat` | chatRouter | JWT | Chat/AI with streaming |
| `/api/workspaces` | workspaceRouter | JWT | Workspace CRUD |
| `/api/workspaces` | workspaceAgentsRouter | JWT | Agent management |
| `/api/workspaces` | approvalsRouter | JWT | Approval queue |
| `/api/teams` | teamRouter | JWT | Team management |
| `/api/invitations` | invitationRouter | JWT | Team invitations |
| `/api/email` | emailRouterRouter | None (SES webhook) | Email routing |
| `/api/whatsapp` | whatsappRouter | None (Kapso webhook) | WhatsApp messages |
| `/api/webhooks/discord` | discordWebhookRouter | Discord signature | Discord events |
| `/api/webhooks/slack` | slackWebhookRouter | Slack signature | Slack events |
| `/api/db` | sqliteRestRouter | API key | SQLite REST API |
| `/api/hooks` | agentTriggerWebhooksRouter | None (public) | Inbound user webhooks |
| `/api/internal` | internalSmokeTestRouter | Localhost only | Smoke tests |

---

## Error Handling

1. `express-async-errors` patches Express to catch async rejections
2. Sentry error handler captures errors for monitoring
3. Centralized `errorHandler` middleware (`src/middleware/error-handler.ts`) formats error responses
4. Domain services throw typed errors from `src/errors/` (e.g., `NotFoundException`, `ValidationException`)
