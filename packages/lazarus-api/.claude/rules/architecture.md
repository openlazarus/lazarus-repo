# Architecture Rules


## Project Structure

Domain-first organization. Each domain owns its controller, service, repository, and types.

```
src/
├── domains/                     # Business domains
│   ├── agent/
│   │   ├── controller/          # HTTP request handlers
│   │   ├── service/             # Business logic
│   │   ├── repository/          # Data access
│   │   └── types/               # Domain types and schemas
│   ├── billing/
│   ├── chat/
│   ├── conversation/
│   ├── discord/
│   ├── email/
│   ├── execution/
│   ├── file/
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
├── routes/                      # Express route definitions (wiring)
├── errors/                      # Custom error classes
├── infrastructure/              # External concerns (config, database)
├── middleware/                   # Express middleware
├── shared/                      # Cross-cutting types and interfaces
├── utils/                       # Utility functions
├── background/                  # Background services (polling, triggers)
├── realtime/                    # WebSocket and event system
├── tools/                       # MCP tool servers
├── prompts/                     # Agent system prompts (loaded at runtime)
├── mcp/                         # MCP server implementations
├── app.ts
└── index.ts
```


## Domain Structure

Each domain folder follows this pattern:

```
domains/agent/
├── controller/
│   └── workspace-agents.controller.ts
├── service/
│   ├── workspace-agent.service.ts
│   └── workspace-agent-executor.ts
├── repository/
│   └── agent.repository.ts
└── types/
    ├── agent.types.ts
    └── agent.schemas.ts
```


## Architecture Layers

### 1. Controller (HTTP Handling)
- Receives HTTP requests, validates input, delegates to services
- Thin logic only — no business rules
- One controller per domain

### 2. Service (Business Logic)
- Contains all business rules and domain logic
- Services depend on repository interfaces, never on concrete implementations

### 3. Repository (Data Access)
- Abstracts database and external data operations
- Services depend on repository interfaces (Dependency Inversion)

### 4. Routes (Wiring)
- Defines Express route paths and HTTP methods
- Maps routes to domain controllers
- Applies middleware (auth, rate limiting, etc.)


## Layer Dependencies
- Controllers → depend on Services
- Services → depend on Repository interfaces
- Repositories → depend on Infrastructure (database, external APIs)
- Routes → depend on Controllers and Middleware
- **Never reverse**: Services must not depend on Controllers or Routes


## Folder Naming Rules

| Folder type | Convention | Examples |
|---|---|---|
| **Top-level categories** | **PLURAL** | `domains/`, `routes/`, `errors/`, `utils/` |
| **Domain folders** | **SINGULAR** | `domains/agent/`, `domains/billing/`, `domains/workspace/` |
| **Layer folders inside domains** | **SINGULAR** | `controller/`, `service/`, `repository/`, `types/` |
| **Infrastructure / non-countable** | **SINGULAR** | `infrastructure/`, `middleware/`, `shared/` |


## Router Pattern

Routes aggregate domain controllers:

```typescript
// routes/workspace-agents.route.ts
import { Router } from 'express'
import { workspaceAgentsController } from '@domains/agent/controller/workspace-agents.controller'
import { authMiddleware } from '@middleware/auth'

const router = Router()
router.get('/', authMiddleware, workspaceAgentsController.list)
router.post('/', authMiddleware, workspaceAgentsController.create)
```
