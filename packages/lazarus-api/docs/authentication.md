# Authentication & Authorization

## Overview

The API uses three authentication strategies depending on the endpoint:

| Strategy | Middleware | Use Case |
|----------|-----------|----------|
| JWT (Supabase) | `requireAuth()` | Standard user requests |
| API Key | `apiKeyAuth` | Database REST endpoints (`/api/db`) |
| Internal-only | `requireInternal()` | Localhost-restricted endpoints |

Source files:

- `src/middleware/auth.ts` -- JWT auth, workspace/team role checks
- `src/middleware/api-key-auth.ts` -- API key validation and rate limiting
- `src/middleware/internal-only.ts` -- Localhost restriction

---

## JWT Authentication (Supabase)

### `requireAuth()`

Validates a Supabase JWT from the `Authorization: Bearer <token>` header.

**Flow**:

1. Extract token from `Authorization` header
2. Check in-memory token cache (60s TTL, max 500 entries)
3. If cache miss, call `supabase.auth.getUser(token)` to verify
4. On success, attach `req.user = { id, email, ...metadata }` and cache the result
5. On failure, return `401`

**Fallback**: Accepts `x-user-id` header for backward compatibility (migration mode). Logs a warning when used.

### `optionalAuth()`

Same as `requireAuth()` but does not fail if no token is present. Attaches `req.user` if a valid token exists, otherwise continues without it.

---

## Workspace Roles

Workspaces support six roles, ordered from most to least privileged:

| Role | Description |
|------|-------------|
| `owner` | Full control. Workspace creator or designated owner. |
| `admin` | Manage workspace settings, members, and all resources. |
| `developer` | Create/edit agents, triggers, MCP configs. |
| `editor` | Edit files, trigger agents, modify content. |
| `member` | Read access to workspace resources. Can interact with agents. |
| `viewer` | Read-only access. Cannot modify anything. |

### Role Resolution

Role is determined by `getUserWorkspaceRole()` in `auth.ts`:

1. Check role cache (30s TTL, max 1000 entries)
2. Query `workspaceRepository.getWorkspaceOwnerIds()` -- if `owner_id` or `user_id` matches, role is `owner`
3. Query `workspaceRepository.getWorkspaceMemberRole()` from `workspace_members` table
4. Cache and return the result (or `null` for no access)

---

## Role-Checking Middleware

All role middleware must be chained after `requireAuth()`. Workspace middleware must also follow `requireWorkspaceAccess()`.

### Middleware Functions

| Middleware | Allowed Roles | Use After |
|------------|--------------|-----------|
| `requireWorkspaceAccess()` | Any workspace member | `requireAuth()` |
| `requireWorkspaceAdmin()` | `owner`, `admin` | `requireWorkspaceAccess()` |
| `requireWorkspaceEditor()` | `owner`, `admin`, `editor` | `requireWorkspaceAccess()` |
| `requireWorkspaceRole(...roles)` | Specified roles only | `requireWorkspaceAccess()` |
| `requireTeamAccess()` | Any team member | `requireAuth()` |
| `requireTeamAdmin()` | `owner`, `admin` | `requireTeamAccess()` |
| `requireResourceOwner(getter)` | User whose ID matches resource | `requireAuth()` |

### Example Usage

```typescript
router.get(
  '/:workspaceId/agents',
  requireAuth(),
  requireWorkspaceAccess(),
  controller.listAgents,
)

router.delete(
  '/:workspaceId/agents/:agentId',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceAdmin(),
  controller.deleteAgent,
)

router.put(
  '/:workspaceId/settings',
  requireAuth(),
  requireWorkspaceAccess(),
  requireWorkspaceRole('owner', 'admin', 'developer'),
  controller.updateSettings,
)
```

### `requireWorkspaceAccess()` Details

1. Reads workspace ID from `req.params.workspaceId`, `req.params.serverId`, `req.workspaceId`, or `x-workspace-id` header
2. Calls `getUserWorkspaceRole()` to verify membership
3. Attaches `req.workspace = { id, teamId, role }` to the request
4. Returns `400` if no workspace ID, `403` if no access

### `requireTeamAccess()` Details

1. Reads team ID from `req.params.teamId` or `x-team-id` header
2. Calls `getUserTeamRole()` to verify membership
3. Attaches `req.team = { id, role }` to the request
4. Returns `400` if no team ID, `403` if not a member

---

## Caching

| Cache | TTL | Max Size | Key Format |
|-------|-----|----------|------------|
| Token cache | 60 seconds | 500 | Raw JWT string |
| Workspace role cache | 30 seconds | 1,000 | `{userId}:{workspaceId}` |
| Team role cache | 30 seconds | 1,000 | `{userId}:{workspaceId}` |

All caches use `TtlCache` from `@domains/cache/service/ttl-cache`.

---

## API Key Authentication

**File**: `src/middleware/api-key-auth.ts`

Used for the SQLite REST API (`/api/db`) and V0 auth endpoints. API keys are workspace-scoped.

### Flow

1. Extract key from `Authorization: Bearer lzrs_xxxxx` header
2. Validate via `workspaceApiKeyService.validateApiKey()`
3. Check rate limit (per-key sliding window)
4. Check database-level permissions (if `dbName` is in URL params)
5. Check operation permissions based on HTTP method
6. Attach `req.apiKey` and `req.workspaceContext` to request

### Rate Limiting

| Parameter | Value |
|-----------|-------|
| Window | 60 seconds |
| Default max requests | 100 per key per minute |
| Custom limit | Configurable per key via `apiKey.rateLimit` |
| Cleanup interval | Every 5 minutes (removes expired entries) |

### Permission Model

API keys carry two permission dimensions:

**Database access** (`apiKey.permissions.databases`):

- `['*']` -- access to all databases
- `['db1', 'db2']` -- access to specific databases only

**Operation access** (`apiKey.permissions.operations`):

| HTTP Method | Required Operation |
|-------------|-------------------|
| GET | `read` |
| POST, PUT, PATCH | `write` |
| DELETE | `delete` |

### Request Context

On success, the middleware attaches:

```typescript
req.apiKey = {
  id: string,
  workspaceId: string,
  createdBy: string,
  permissions: { databases: string[], operations: string[] },
  rateLimit?: number,
}

req.workspaceContext = {
  workspaceId: string,
  userId: string,
  scope: 'team',
}
```

---

## Internal-Only Endpoints

**File**: `src/middleware/internal-only.ts`

### `requireInternal()`

Restricts access to requests originating from localhost only. Used for agent-to-agent triggers and internal smoke tests.

**Allowed addresses**: `127.0.0.1`, `::1`, `::ffff:127.0.0.1`

```typescript
router.post('/trigger', requireInternal(), controller.triggerAgent)
```

Returns `403` with `"This endpoint is only accessible internally"` for non-localhost requests.

---

## Global Rate Limiting

**File**: `src/middleware/rate-limit.ts`

Applied to all `/api` routes via `apiRateLimit()`:

| Environment | Window | Max Requests |
|-------------|--------|-------------|
| Production | 1 minute | 1,000 |
| Development | 1 minute | 10,000 |

Uses `express-rate-limit` with standard headers and `trust proxy` enabled for ALB.
