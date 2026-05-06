# Contributing Guide

---

## How to Contribute

### 1. Fork and clone

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/<your-username>/lazarus.git
cd lazarus
./setup.sh   # Installs lefthook git hooks
```

### 2. Create a branch

```bash
git checkout -b feat/my-feature
```

Use a descriptive branch name with a prefix: `feat/`, `fix/`, `refactor/`, `docs/`.

### 3. Make your changes

Follow the code standards below. Run lint and build before committing:

```bash
npm run format:check
npm run lint
npm run build
```

### 4. Commit and push

```bash
git add <files>
git commit -m "feat: add workspace export endpoint"
git push origin feat/my-feature
```

Pre-commit hooks will run automatically (prettier + eslint). If they fail, fix the issues and try again.

### 5. Open a Pull Request

- Go to the original repo on GitHub
- Click "New Pull Request" and select your fork/branch
- Fill in the PR template: describe what you changed and why
- A maintainer will review your PR, may request changes
- Once approved, a maintainer will merge it

### Guidelines

- Keep PRs focused on a single change
- Add tests for new features when possible
- Update documentation if you change API behavior
- Don't include unrelated changes in the same PR

---

## Development Setup

### Prerequisites

- Node.js 20+
- npm
- Access to Supabase project and required API keys

### Install and Run

```bash
cd packages/lazarus-api
npm install
cp .env.example .env   # Fill in required values
npm run dev             # Starts on port 8000 with tsx + tsconfig-paths
```

### Verify

```bash
curl http://localhost:8000/health
# {"status":"healthy","service":"lazarus-api-ts"}
```

---

## Project Structure

Domain-first organization. Each domain owns its controller, service, repository, and types.

```
src/
├── domains/           # Business domains (singular names)
│   ├── agent/
│   │   ├── controller/
│   │   ├── service/
│   │   ├── repository/
│   │   └── types/
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
├── routes/            # Express route wiring
├── errors/            # Custom error classes
├── infrastructure/    # Config, database clients
├── middleware/         # Express middleware
├── shared/            # Cross-cutting types and interfaces
├── utils/             # Utility functions
├── background/        # Background services
├── realtime/          # WebSocket and event system
├── tools/             # MCP tool servers
├── prompts/           # Agent system prompts
└── mcp/               # MCP server implementations
```

### Adding a New Domain

1. Create `src/domains/{name}/` with four subdirectories:

```
src/domains/notification/
├── controller/
│   └── notification.controller.ts
├── service/
│   └── notification.service.ts
├── repository/
│   └── notification.repository.ts
└── types/
    ├── notification.types.ts
    └── notification.schemas.ts
```

2. Create a route file in `src/routes/{name}.ts` that wires the controller to Express routes.
3. Register the router in `src/app.ts`.

### Layer Rules

| Layer | Depends On | Never Depends On |
|-------|-----------|-----------------|
| Controller | Service | -- |
| Service | Repository interfaces | Controller, Routes |
| Repository | Infrastructure | Service, Controller |
| Routes | Controller, Middleware | Service, Repository |

---

## Naming Conventions

### Variables and Functions

| Kind | Convention | Example |
|------|-----------|---------|
| Function | camelCase, verb + noun | `createUser`, `findUserById`, `validateEmail` |
| Variable | camelCase | `userData`, `isValid` |
| Constant | UPPER_SNAKE_CASE | `MAX_RETRY_ATTEMPTS`, `DEFAULT_PAGE_SIZE` |

### Classes and Types

| Kind | Convention | Example |
|------|-----------|---------|
| Class | PascalCase | `UserService`, `AgentRepository` |
| Interface | `I` prefix | `IUserService`, `IAgentRepository` |
| Type | `T` prefix | `TUserResponse`, `TAgentConfig` |
| Enum | `E` prefix | `EUserRole`, `EOrderStatus` |

### Function Naming Patterns

| Pattern | Use |
|---------|-----|
| `create[Entity]` | Create new |
| `get[Entity]ById` | Retrieve single |
| `find[Entity]By[Criteria]` | Query with criteria |
| `update[Entity]` | Update existing |
| `delete[Entity]` | Delete |
| `validate[Thing]` | Validate input |
| `is[Condition]` / `has[Thing]` | Boolean check |
| `map[From]To[To]` | Data transformation |

### Files and Folders

- All files: **kebab-case** (`workspace-agent.service.ts`)
- Top-level categories: **plural** (`domains/`, `routes/`, `errors/`, `utils/`)
- Domain folders: **singular** (`domains/agent/`, `domains/workspace/`)
- Layer folders inside domains: **singular** (`controller/`, `service/`, `repository/`, `types/`)

| File Type | Pattern |
|-----------|---------|
| Controller | `[name].controller.ts` |
| Service | `[name].service.ts` |
| Repository | `[name].repository.ts` |
| Types | `[name].types.ts` |
| Schemas | `[name].schemas.ts` |
| Middleware | `[name].middleware.ts` |

---

## Code Quality Standards

### Function Size

Every function must be 15 lines or fewer (excluding blank lines and comments). Break large functions into single-purpose helpers.

### SOLID Principles

- **Single Responsibility**: each class/function does one thing.
- **Open/Closed**: extend behavior without modifying existing code.
- **Dependency Inversion**: services depend on repository interfaces, never on concrete implementations.

### Maps Over Switch

Use handler maps for dispatch logic:

```typescript
// Preferred
const STATUS_MESSAGES: Record<string, string> = {
  pending: 'Pending',
  shipped: 'Shipped',
}
const getMessage = (status: string): string => STATUS_MESSAGES[status] ?? 'Unknown'
```

Exception: `switch` is acceptable for TypeScript discriminated unions where type narrowing is needed.

### Comments

- Default to **no comments** -- code should be self-documenting.
- Comment **why**, never **what**.
- Never add redundant comments like `// Creates a new user`.
- Acceptable: complex algorithm rationale, business context, `TODO` with assignee, warnings.

### Immutability

- Always `const`, use `readonly` for class properties.
- Prefer `.map()`, `.filter()`, `.reduce()` over `.push()`, `.splice()`.
- Return new objects instead of mutating.

### Error Handling

- Throw domain-specific errors extending `ApiError` (from `@errors/api-errors`).
- Available classes: `BadRequestError`, `NotFoundError`, `ForbiddenError`, `ConflictError`, `ValidationError`, `RateLimitError`, `InternalServerError`, `ServiceUnavailableError`.
- The global `errorHandler` middleware catches all errors.

---

## TypeScript Standards

### Strict Typing

- Explicit types on all function parameters and return types.
- Never use `any` -- use `unknown` or a proper type.
- Strict mode is enabled with all strict flags.

### Path Aliases (mandatory)

Never use relative imports. Use the `@*` path alias:

```typescript
// Wrong
import { AgentService } from '../../../domains/agent/service/agent.service'

// Correct
import { AgentService } from '@domains/agent/service/agent.service'
import { createLogger } from '@utils/logger'
import { authMiddleware } from '@middleware/auth'
```

The alias is defined in `tsconfig.json`: `"paths": { "@*": ["./src/*"] }`.

### Types vs Interfaces vs Classes

| Use | For |
|-----|-----|
| `type` | Response objects, union types, props, aliases |
| `interface` | Service contracts, repository contracts, class implementation contracts |
| `class` | Service, repository, controller implementations |

---

## Pre-commit Hooks

[Lefthook](https://github.com/evilmartians/lefthook) runs `lint-staged` on every commit. The pipeline:

1. **Prettier** formats staged `.ts` files.
2. **ESLint** fixes staged `.ts` files.

If either step fails, the commit is rejected.

### Prettier Config

```json
{
  "semi": false,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

### ESLint Rules

- `no-console`: warn (except `console.warn` and `console.error`)
- `@typescript-eslint/no-unused-vars`: error (args prefixed with `_` are ignored)
- Extends `eslint:recommended` and `plugin:@typescript-eslint/recommended`

---

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/). Title only, no scope, no body.

```
feat: add workspace settings endpoint
fix: correct slug validation for hyphens
refactor: extract agent trigger logic into service
docs: update API reference for MCP routes
chore: upgrade pino to v10
```

| Prefix | When |
|--------|------|
| `feat:` | New feature |
| `fix:` | Bug fix |
| `refactor:` | Code restructuring, no behavior change |
| `docs:` | Documentation only |
| `chore:` | Dependencies, tooling, CI |
| `test:` | Adding or updating tests |

---

## Available npm Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (tsx with tsconfig-paths) |
| `npm run build` | Clean, compile TypeScript, resolve path aliases |
| `npm start` | Run compiled output (`dist/index.js`) |
| `npm run typecheck` | Type-check without emitting (`tsc --noEmit`) |
| `npm run lint` | Run ESLint on `src/**/*.ts` |
| `npm run format` | Format all source files with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm test` | Run Jest tests |
| `npm run test:watch` | Run Jest in watch mode |
| `npm run test:coverage` | Run Jest with coverage report |
| `npm run test:integration` | Run integration test suite |
| `npm run test:quick` | Run quick smoke tests |

---

## Pre-push Checklist

```bash
npm run format:check
npm run lint
npm run build
```

Verify all three pass before pushing. The build step compiles TypeScript and resolves path aliases -- it catches errors that `tsc --noEmit` alone may miss.
