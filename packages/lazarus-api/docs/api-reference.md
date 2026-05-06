# API Endpoint Reference

Base URL: `http://localhost:8000` (or wherever you've deployed your instance).

All authenticated endpoints require a valid Supabase JWT in the `Authorization: Bearer <token>` header unless otherwise noted.

---

## Health

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | None | Health check (used by ALB). Returns memory pressure status. |

---

## Workspaces

### CRUD

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces` | Bearer | -- | List workspaces for current user |
| GET | `/api/workspaces/templates` | Bearer | -- | List workspace templates |
| GET | `/api/workspaces/:workspaceId` | Bearer | member | Get workspace by ID |
| POST | `/api/workspaces` | Bearer | -- | Create workspace |
| PUT | `/api/workspaces/:workspaceId` | Bearer | admin | Update workspace |
| DELETE | `/api/workspaces/:workspaceId` | Bearer | member | Soft-delete workspace |
| POST | `/api/workspaces/:workspaceId/transfer` | Bearer | member | Transfer workspace ownership |

### Files

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/files` | Bearer | member | List files in workspace |
| GET | `/api/workspaces/:workspaceId/file/*` | Bearer | member | Read file by path |
| PUT | `/api/workspaces/:workspaceId/file/*` | Bearer | member | Write file by path |
| POST | `/api/workspaces/:workspaceId/upload` | Bearer | member | Upload file (multipart, 200 MB max) |
| DELETE | `/api/workspaces/:workspaceId/file/*` | Bearer | member | Delete file by path |
| POST | `/api/workspaces/:workspaceId/move` | Bearer | member | Move or rename file |
| POST | `/api/workspaces/:workspaceId/directory` | Bearer | member | Create directory |
| POST | `/api/workspaces/:workspaceId/file/lock` | Bearer | member | Lock file |
| POST | `/api/workspaces/:workspaceId/file/unlock` | Bearer | member | Unlock file |

### Members

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/members` | Bearer | member | List members |
| POST | `/api/workspaces/:workspaceId/members` | Bearer | admin | Add member |
| PATCH | `/api/workspaces/:workspaceId/members/:memberId` | Bearer | admin | Update member role |
| DELETE | `/api/workspaces/:workspaceId/members/me` | Bearer | member | Leave workspace |
| DELETE | `/api/workspaces/:workspaceId/members/:memberId` | Bearer | admin | Remove member |

### Invitations (workspace-scoped)

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/invitations` | Bearer | member | List invitations |
| POST | `/api/workspaces/:workspaceId/invitations` | Bearer | admin | Create invitation |
| DELETE | `/api/workspaces/:workspaceId/invitations/:invitationId` | Bearer | admin | Cancel invitation |

### Config

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/config` | Bearer | member | Get workspace config |
| PUT | `/api/workspaces/:workspaceId/config` | Bearer | admin | Update workspace config |
| POST | `/api/workspaces/:workspaceId/config/validate-slug` | Bearer | -- | Validate slug availability |
| GET | `/api/workspaces/:workspaceId/context` | Bearer | member | Get workspace context |
| GET | `/api/workspaces/:workspaceId/mcp` | Bearer | member | Get workspace MCP config (legacy) |
| POST | `/api/workspaces/:workspaceId/template-database` | Bearer | member | Create template database |

---

## Agents

### CRUD

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/agents` | Bearer | member | List agents |
| GET | `/api/workspaces/:workspaceId/agents/:agentId` | Bearer | member | Get agent |
| POST | `/api/workspaces/:workspaceId/agents` | Bearer | editor | Create agent |
| PUT | `/api/workspaces/:workspaceId/agents/:agentId` | Bearer | editor | Update agent |
| DELETE | `/api/workspaces/:workspaceId/agents/:agentId` | Bearer | editor | Delete agent |
| POST | `/api/workspaces/:workspaceId/agents/:agentId/enable` | Bearer | editor | Enable agent |
| POST | `/api/workspaces/:workspaceId/agents/:agentId/disable` | Bearer | editor | Disable agent |

### Triggers

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/agents/:agentId/triggers` | Bearer | member | List triggers |
| GET | `/api/workspaces/:workspaceId/agents/:agentId/triggers/:triggerId` | Bearer | member | Get trigger |
| POST | `/api/workspaces/:workspaceId/agents/:agentId/triggers` | Bearer | editor | Create trigger |
| PUT | `/api/workspaces/:workspaceId/agents/:agentId/triggers/:triggerId` | Bearer | editor | Update trigger |
| DELETE | `/api/workspaces/:workspaceId/agents/:agentId/triggers/:triggerId` | Bearer | editor | Delete trigger |
| POST | `/api/workspaces/:workspaceId/agents/:agentId/triggers/:triggerId/execute` | Bearer | member | Execute trigger manually |
| POST | `/api/workspaces/:workspaceId/agents/:agentId/triggers/:triggerId/run` | Bearer | member | Execute trigger (alias) |
| GET | `/api/workspaces/:workspaceId/agents/:agentId/triggers/:triggerId/executions` | Bearer | member | Get trigger execution history |
| POST | `/api/workspaces/:workspaceId/agents/:agentId/trigger` | Internal | -- | Internal trigger (localhost only) |

### WhatsApp

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/agents/:agentId/whatsapp` | Bearer | member | Get WhatsApp config |
| DELETE | `/api/workspaces/:workspaceId/agents/:agentId/whatsapp` | Bearer | editor | Disconnect WhatsApp |
| POST | `/api/workspaces/:workspaceId/whatsapp/setup-link` | Bearer | editor | Create WhatsApp setup link |
| GET | `/api/workspaces/:workspaceId/whatsapp/customer` | Bearer | member | Get WhatsApp customer info |
| GET | `/api/workspaces/:workspaceId/whatsapp/phone-numbers` | Bearer | member | List phone numbers |
| POST | `/api/workspaces/:workspaceId/agents/:agentId/whatsapp/assign` | Bearer | editor | Assign phone number to agent |
| PUT | `/api/workspaces/:workspaceId/agents/:agentId/whatsapp/settings` | Bearer | editor | Update WhatsApp settings |

### Email Settings

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| PUT | `/api/workspaces/:workspaceId/agents/:agentId/auto-trigger-email` | Bearer | editor | Toggle email auto-trigger |
| PUT | `/api/workspaces/:workspaceId/agents/:agentId/email-restriction` | Bearer | editor | Toggle email restriction |
| GET | `/api/workspaces/:workspaceId/agents/:agentId/email-allowlist` | Bearer | member | Get email allowlist |
| PUT | `/api/workspaces/:workspaceId/agents/:agentId/email-allowlist` | Bearer | editor | Update email allowlist |

### Execution and Config

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| POST | `/api/workspaces/:workspaceId/executions/:executionId/stop` | Bearer | member | Stop running execution |
| GET | `/api/workspaces/:workspaceId/agents/:agentId/files` | Bearer | member | List agent files |
| GET | `/api/workspaces/:workspaceId/agents/:agentId/config` | Bearer | member | Get agent config |
| GET | `/api/workspaces/:workspaceId/agents/:agentId/mcp-tools` | Bearer | member | Discover available MCP tools |
| POST | `/api/workspaces/:workspaceId/initialize-system-agents` | Bearer | admin | Initialize system agents |

---

## Chat

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/chat/stream` | Bearer | Stream a chat response (SSE) |
| POST | `/api/chat/query` | Bearer | One-shot chat query |
| POST | `/api/chat/internal/permission-request` | Internal | Backend-only permission request |
| POST | `/api/chat/permission-response` | Bearer | Respond to a permission prompt |
| POST | `/api/chat/ask-user-response` | Bearer | Respond to an ask-user prompt |

---

## Sessions

All session endpoints extract `workspaceId` from the `x-workspace-id` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/sessions` | Bearer | Create session |
| GET | `/api/sessions` | Bearer | List sessions |
| GET | `/api/sessions/:sessionId` | Bearer | Get session |
| PATCH | `/api/sessions/:sessionId` | Bearer | Update session |
| DELETE | `/api/sessions/:sessionId` | Bearer | Delete session |
| POST | `/api/sessions/:sessionId/messages` | Bearer | Append message |
| GET | `/api/sessions/:sessionId/transcript` | Bearer | Get transcript |
| POST | `/api/sessions/:sessionId/complete` | Bearer | Mark session complete |
| POST | `/api/sessions/:sessionId/interrupt` | Bearer | Interrupt session |
| GET | `/api/sessions/:sessionId/export` | Bearer | Export session |
| POST | `/api/sessions/import` | Bearer | Import session |
| POST | `/api/sessions/cleanup` | Bearer | Cleanup stale sessions |

---

## Conversations

All conversation endpoints extract `workspaceId` from the `x-workspace-id` header where applicable.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/conversations` | Bearer | List conversations |
| GET | `/api/conversations/by-session/:sessionId` | Bearer | Get conversation by session |
| GET | `/api/conversations/:id` | Bearer | Get conversation by ID |
| PATCH | `/api/conversations/:id` | Bearer | Update conversation |
| DELETE | `/api/conversations/:id` | Bearer | Delete conversation |
| GET | `/api/conversations/:id/messages` | Bearer | Get messages |
| POST | `/api/conversations/:id/generate-title` | Bearer | Generate title via AI |

---

## MCP -- Global

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/mcp/servers` | Bearer | List MCP servers |
| POST | `/api/mcp/servers/:serverName` | Bearer | Add server |
| DELETE | `/api/mcp/servers/:serverName` | Bearer | Remove server |
| POST | `/api/mcp/servers/:serverName/enable` | Bearer | Enable server |
| POST | `/api/mcp/servers/:serverName/disable` | Bearer | Disable server |
| PATCH | `/api/mcp/servers/:serverName/env` | Bearer | Update server env vars |
| GET | `/api/mcp/servers/:serverName/status` | Bearer | Get server status |
| POST | `/api/mcp/servers/:serverName/test-connection` | Bearer | Test server connection |
| POST | `/api/mcp/servers/validate` | Bearer | Validate server config |
| POST | `/api/mcp/servers/from-preset` | Bearer | Add server from preset |
| GET | `/api/mcp/config` | Bearer | Get MCP config |
| GET | `/api/mcp/presets` | Bearer | List presets |
| GET | `/api/mcp/categories` | Bearer | List categories |
| GET | `/api/mcp/oauth/callback` | None | OAuth callback handler |

---

## MCP -- Workspace

All workspace MCP endpoints require `member` access. Write operations require role `owner`, `admin`, or `developer`.

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/mcp/sources` | Bearer | member | List MCP sources |
| GET | `/api/workspaces/mcp/presets` | Bearer | -- | List workspace MCP presets |
| GET | `/api/workspaces/:workspaceId/mcp` | Bearer | member | Get MCP config |
| PUT | `/api/workspaces/:workspaceId/mcp` | Bearer | developer+ | Update MCP config |
| POST | `/api/workspaces/:workspaceId/mcp/servers/:serverName` | Bearer | developer+ | Add server |
| POST | `/api/workspaces/:workspaceId/mcp/servers/:serverName/enable` | Bearer | developer+ | Enable server |
| POST | `/api/workspaces/:workspaceId/mcp/servers/:serverName/disable` | Bearer | developer+ | Disable server |
| PATCH | `/api/workspaces/:workspaceId/mcp/servers/:serverName` | Bearer | developer+ | Update server |
| PATCH | `/api/workspaces/:workspaceId/mcp/servers/:serverName/toggle` | Bearer | developer+ | Toggle server |
| PATCH | `/api/workspaces/:workspaceId/mcp/servers/:serverName/env` | Bearer | developer+ | Update server env vars |
| DELETE | `/api/workspaces/:workspaceId/mcp/servers/:serverName` | Bearer | developer+ | Delete server |
| POST | `/api/workspaces/:workspaceId/mcp/servers/:serverName/test-connection` | Bearer | member | Test connection |
| GET | `/api/workspaces/:workspaceId/mcp/servers/:serverName/oauth-status` | Bearer | member | Get OAuth status |
| POST | `/api/workspaces/:workspaceId/mcp/servers/:serverName/initiate-oauth` | Bearer | member | Start OAuth flow |
| POST | `/api/workspaces/:workspaceId/mcp/servers/:serverName/mark-authorized` | Bearer | member | Mark as authorized |
| DELETE | `/api/workspaces/:workspaceId/mcp/servers/:serverName/oauth` | Bearer | developer+ | Clear OAuth credentials |
| POST | `/api/workspaces/:workspaceId/mcp/servers/:serverName/restart` | Bearer | developer+ | Restart single server |
| POST | `/api/workspaces/:workspaceId/mcp/restart` | Bearer | developer+ | Restart all servers |
| POST | `/api/workspaces/:workspaceId/mcp/initialize` | Bearer | -- | Initialize MCP for workspace |
| POST | `/api/workspaces/:workspaceId/mcp/copy` | Bearer | developer+ | Copy MCP config from another workspace |
| POST | `/api/workspaces/:workspaceId/mcp/upload-credential` | Bearer | developer+ | Upload credential file (5 MB max) |
| DELETE | `/api/workspaces/:workspaceId/mcp/credentials/:serverName` | Bearer | developer+ | Delete credential file |

---

## MCP -- User Templates

All endpoints require the authenticated user to match `:userId`.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/users/:userId/mcp-templates` | Bearer (owner) | List templates |
| POST | `/api/users/:userId/mcp-templates/initialize` | Bearer (owner) | Initialize default templates |
| POST | `/api/users/:userId/mcp-templates/:templateName` | Bearer (owner) | Add template |
| PUT | `/api/users/:userId/mcp-templates` | Bearer (owner) | Replace all templates |
| DELETE | `/api/users/:userId/mcp-templates/:templateName` | Bearer (owner) | Remove template |
| POST | `/api/users/:userId/mcp-templates/:templateName/activate` | Bearer (owner) | Activate template |
| POST | `/api/users/:userId/mcp-templates/deactivate` | Bearer (owner) | Deactivate template |
| GET | `/api/users/:userId/mcp-templates/available/:workspaceId` | Bearer (owner) | List available templates for workspace |

---

## Files API

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/files/workspace/:workspaceId` | Bearer | member | List files |
| GET | `/api/files/workspace/:workspaceId/read` | Bearer | member | Read file (query: `path`) |
| POST | `/api/files/workspace/:workspaceId/write` | Bearer | editor | Write file |
| DELETE | `/api/files/workspace/:workspaceId` | Bearer | editor | Delete file |
| GET | `/api/files/workspace/:workspaceId/history` | Bearer | member | Get version history |
| GET | `/api/files/workspace/:workspaceId/version/:versionId` | Bearer | member | Get specific version |
| POST | `/api/files/workspace/:workspaceId/restore` | Bearer | editor | Restore file from version |

---

## Knowledge

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/knowledge` | Bearer | Get knowledge graph |
| GET | `/api/workspaces/:workspaceId/knowledge/search` | Bearer | Search knowledge base |
| GET | `/api/workspaces/:workspaceId/knowledge/:type` | Bearer | Get knowledge by type |
| GET | `/api/workspaces/:workspaceId/knowledge/artifacts/:artifactId` | Bearer | Get artifact |
| POST | `/api/workspaces/:workspaceId/knowledge/analyze` | Bearer | Analyze content |
| POST | `/api/workspaces/:workspaceId/knowledge/update-graph` | Bearer | Update knowledge graph |

---

## Teams

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/teams` | Bearer | List teams for current user |
| POST | `/api/teams` | Bearer | Create team |
| GET | `/api/teams/:teamId` | Bearer | Get team |
| PUT | `/api/teams/:teamId` | Bearer | Update team |
| DELETE | `/api/teams/:teamId` | Bearer | Soft-delete team |
| GET | `/api/teams/:teamId/members` | Bearer | List members |
| POST | `/api/teams/:teamId/members` | Bearer | Add member |
| PATCH | `/api/teams/:teamId/members/:memberId` | Bearer | Update member role |
| DELETE | `/api/teams/:teamId/members/:memberId` | Bearer | Remove member |
| GET | `/api/teams/:teamId/role` | Bearer | Get current user's role |
| GET | `/api/teams/:teamId/workspaces` | Bearer | List team workspaces |

---

## Invitations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/invitations` | Bearer | Create invitation |
| POST | `/api/invitations/accept` | Bearer | Accept invitation |
| GET | `/api/invitations` | Bearer | List pending invitations |
| DELETE | `/api/invitations/:invitationId` | Bearer | Cancel invitation |
| POST | `/api/invitations/expire-old` | Cron secret | Expire old invitations |

---

## Activity

### Global Activity

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/activity/logs` | Bearer | Create activity log |
| GET | `/api/activity/logs` | Bearer | List activity logs |
| GET | `/api/activity/logs/:id` | Bearer | Get activity log |
| GET | `/api/activity/logs/:id/detail` | Bearer | Get log detail |
| GET | `/api/activity/logs/:id/stream` | Bearer | Stream log (SSE) |
| POST | `/api/activity/logs/:id/stop` | Bearer | Stop active log |
| DELETE | `/api/activity/logs/:id` | Bearer | Delete activity log |
| GET | `/api/activity/workflow/:workflowId` | Bearer | Get workflow logs |
| GET | `/api/activity/executing` | Bearer | List currently executing logs |

### Workspace Activity

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/activity` | Bearer | member | List workspace activity |
| GET | `/api/workspaces/:workspaceId/activity/contributions` | Bearer | member | Get contribution data |
| GET | `/api/workspaces/:workspaceId/activity/:logId` | Bearer | member | Get specific log |
| GET | `/api/workspaces/:workspaceId/activity/workflow/:workflowId` | Bearer | member | Get workflow activity |

---

## SQLite REST

All SQLite REST endpoints use **API key** authentication via `x-api-key` header (not Bearer token).

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/db/:workspaceId/:dbName/schema` | API key | Get database schema |
| POST | `/api/db/:workspaceId/:dbName/query` | API key | Execute SQL query |
| GET | `/api/db/:workspaceId/:dbName/:table` | API key | List records |
| GET | `/api/db/:workspaceId/:dbName/:table/:id` | API key | Get record by ID |
| POST | `/api/db/:workspaceId/:dbName/:table` | API key | Create record |
| PUT | `/api/db/:workspaceId/:dbName/:table/:id` | API key | Update record |
| DELETE | `/api/db/:workspaceId/:dbName/:table/:id` | API key | Delete record |

---

## SQLite Tools

Workspace is extracted from the `x-workspace-id` header.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/sqlite/list-databases` | Bearer | List databases in workspace |
| POST | `/api/sqlite/create-database` | Bearer | Create database |
| POST | `/api/sqlite/query` | Bearer | Execute read query |
| POST | `/api/sqlite/execute` | Bearer | Execute write query |
| GET | `/api/sqlite/schema-info` | Bearer | Get schema information |
| POST | `/api/sqlite/export` | Bearer | Export database |

---

## API Keys

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/api-keys/all` | Bearer | -- | List all API keys for user |
| GET | `/api/workspaces/:serverId/api-keys` | Bearer | -- | List keys for workspace |
| GET | `/api/workspaces/:serverId/api-keys/:keyId` | Bearer | -- | Get key |
| POST | `/api/workspaces/:serverId/api-keys` | Bearer | owner/developer | Create key |
| DELETE | `/api/workspaces/:serverId/api-keys/:keyId` | Bearer | -- | Revoke key |

---

## Approvals

| Method | Path | Auth | Role | Description |
|--------|------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/approvals` | Bearer | member | List pending approvals |
| GET | `/api/workspaces/:workspaceId/approvals/count` | Bearer | member | Get approval count |
| GET | `/api/workspaces/:workspaceId/approvals/:approvalId` | Bearer | member | Get approval detail |
| POST | `/api/workspaces/:workspaceId/approvals/:approvalId/resolve` | Bearer | member | Approve or reject |

---

## V0

### Apps

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/workspaces/:serverId/v0-apps/setup-deployment` | Bearer | Setup V0 deployment |
| POST | `/api/workspaces/:serverId/v0-apps/regenerate-api-key` | Bearer | Regenerate V0 API key |
| POST | `/api/workspaces/:serverId/v0-apps/generate-token` | Bearer | Generate V0 token |

### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v0-auth/generate-token` | Bearer | Generate auth token |
| POST | `/api/v0-auth/exchange-token` | None (API key CORS) | Exchange token |
| GET | `/api/v0-auth/stats` | None | Get token stats |

### Tools

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v0/chat/:chatId` | Bearer | Get V0 chat |
| GET | `/api/v0/deployments` | Bearer | List deployments |
| GET | `/api/v0/manage-env-vars` | Bearer | Get environment variables |
| GET | `/api/v0/deployment-logs/:deploymentId` | Bearer | Get deployment logs |

---

## Webhooks -- Inbound

These endpoints receive callbacks from external services. They do not require Bearer authentication; each uses its own verification mechanism.

### Slack

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhooks/slack/events` | Slack signature | Handle Slack events |
| POST | `/api/webhooks/slack/command` | Slack signature | Handle slash commands |
| POST | `/api/webhooks/slack/interactivity` | Slack signature | Handle interactive components |

### Discord

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhooks/discord` | None (Discord interaction verification) | Handle Discord interactions |

### Discord Settings

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/workspaces/:workspaceId/discord/:connectionId/settings` | None | Get Discord settings |
| PUT | `/api/workspaces/:workspaceId/discord/:connectionId/settings` | None | Update Discord settings |
| GET | `/api/workspaces/:workspaceId/discord/:connectionId/guild-roles` | None | List guild roles |
| GET | `/api/workspaces/:workspaceId/discord/:connectionId/guild-channels` | None | List guild channels |

### WhatsApp

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/whatsapp/webhook` | None | Webhook verification (challenge) |
| POST | `/api/whatsapp/webhook` | None | Handle incoming WhatsApp messages |
| GET | `/api/whatsapp/webhook/health` | None | Webhook health check |
| GET | `/api/whatsapp/global` | None | Global webhook verification |
| POST | `/api/whatsapp/global` | Kapso signature | Handle global WhatsApp messages |
| GET | `/api/whatsapp/global/health` | None | Global webhook health check |

### Email

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/email/route` | None (SES webhook) | Route incoming email to agent |
| GET | `/api/email/route/health` | None | Email routing health check |

### Agent Webhooks

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/webhooks/agent-email/:agentId` | None | Handle inbound agent email |
| POST | `/api/webhooks/agent-email-status/:agentId` | None | Handle email delivery status |
| POST | `/api/hooks/:workspaceId/:agentId/:triggerId` | None | User-facing inbound webhook trigger |

---

## Background

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/background/health` | None | Background system health |
| GET | `/api/background/stats` | Bearer | Background process statistics |
| POST | `/api/background/workspaces/:workspaceId/reload` | Bearer | Reload workspace processes |
| POST | `/api/background/workspaces/:workspaceId/load` | Bearer | Load workspace processes |
| POST | `/api/background/workspaces/:workspaceId/unload` | Bearer | Unload workspace processes |

---

## Diagnostics

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/diagnostics/integrations/config` | Bearer | Get integration config |
| GET | `/api/diagnostics/integrations/connections/:workspaceId` | Bearer | Get active connections |
| GET | `/api/diagnostics/integrations/conversations/:workspaceId` | Bearer | Get integration conversations |
| POST | `/api/diagnostics/integrations/test-attachment/:workspaceId` | Bearer | Test attachment handling |
| GET | `/api/diagnostics/integrations/webhook-endpoints` | Bearer | List webhook endpoints |
| GET | `/api/diagnostics/integrations/oauth-urls/:workspaceId` | Bearer | Get OAuth URLs |

---

## Internal

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/internal/impersonate` | Internal (localhost) | Smoke test impersonation |

---

## Rate Limits

Global rate limit applied to all `/api` routes:

| Environment | Window | Max Requests |
|-------------|--------|-------------|
| Production | 1 minute | 1,000 |
| Development | 1 minute | 10,000 |

Rate-limited responses return HTTP `429` with body:

```json
{
  "message": "Too many requests, please try again later."
}
```

Standard rate-limit headers are included (`RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`).

---

## Error Response Format

All errors follow a consistent JSON structure:

```json
{
  "error": "Short error title",
  "message": "Detailed explanation (optional)"
}
```

### HTTP Status Codes

| Code | Error Class | Meaning |
|------|-------------|---------|
| 400 | `BadRequestError` | Invalid input or precondition failure |
| 401 | `UnauthorizedError` | Missing or invalid authentication |
| 403 | `ForbiddenError` | Insufficient permissions |
| 404 | `NotFoundError` | Resource not found |
| 409 | `ConflictError` | Resource conflict (e.g., duplicate slug) |
| 422 | `ValidationError` | Schema validation failure |
| 422 | `ExecutionFailedError` | Agent execution failed (includes `executionId`) |
| 429 | `RateLimitError` | Too many requests |
| 500 | `InternalServerError` | Unexpected server error |
| 503 | `ServiceUnavailableError` | Service temporarily unavailable |

In development mode, `500` errors include the raw `message` field for debugging.
