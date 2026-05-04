# MCP (Model Context Protocol)

## Overview

MCP is the protocol Lazarus uses to give AI agents access to external tools and services. Each MCP server exposes a set of tools via JSON-RPC over stdio or HTTP. During agent execution, the Claude SDK connects to configured MCP servers and makes their tools available to the model.

Lazarus manages MCP configuration at three levels:
1. **Global** -- platform-wide server config (`config/mcp_servers.json`)
2. **Workspace** -- per-workspace config (`.mcp.config.json` / `.mcp.json`)
3. **Agent** -- per-agent overrides (`config.agent.json` `mcpServers` field)

Additionally, Lazarus runs **built-in in-process tool servers** (email, SQLite, WhatsApp, etc.) that are injected into every execution.

---

## Global MCP Config

**Manager:** `EnhancedMCPConfigManager` (`src/infrastructure/config/mcp-enhanced.ts`)
**Config file:** `config/mcp_servers.json`

The global config stores platform-level MCP servers. It supports:

| Operation | Method |
|-----------|--------|
| List servers | `listServers({ search?, category?, status? })` |
| Add server | `addServer(name, config)` |
| Remove server | `removeServer(name)` |
| Enable/disable | `enableServer(name)` / `disableServer(name)` |
| Update env vars | `updateServerEnv(name, env)` |
| Test connection | `testServerConnection(name)` |
| Add from preset | `addServerFromPreset(presetId, envValues)` |

### Config format

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "..."],
      "enabled": true,
      "icon": "...",
      "category": "database",
      "description": "PostgreSQL database"
    }
  }
}
```

### SDK compatibility

`cleanConfigForSDK()` strips non-standard fields (icon, category, description, enabled) before passing to the Claude SDK. Supports both stdio servers (`command`/`args`) and HTTP/SSE servers (`url`/`headers`).

---

## Workspace-Scoped MCP

**Manager:** `MCPConfigManager` (`src/domains/mcp/service/mcp-config-manager.ts`)
**Source of truth:** `{workspacePath}/.mcp.config.json`
**SDK-readable:** `{workspacePath}/.mcp.json` (auto-generated, only enabled servers)

Each workspace has its own MCP configuration. The service maintains two files:

| File | Purpose |
|------|---------|
| `.mcp.config.json` | Full config with `enabled` flags (source of truth) |
| `.mcp.json` | Filtered config with only enabled servers (read by Claude SDK from `cwd`) |

When `.mcp.config.json` is saved, `.mcp.json` is regenerated automatically.

### Operations

| Method | Description |
|--------|-------------|
| `getWorkspaceMCPConfig(path)` | Load config (migrates from legacy `.mcp.json` if needed) |
| `saveWorkspaceMCPConfig(path, config)` | Save and regenerate `.mcp.json` |
| `addMCPServer(path, name, config)` | Add or update a single server |
| `removeMCPServer(path, name)` | Remove a server |
| `toggleMCPServer(path, name, enabled)` | Enable/disable |
| `initializeWorkspaceMCP(path)` | Create default config if not exists |
| `copyMCPConfig(source, target)` | Clone config between workspaces |
| `mergeMCPConfigs(base, override, target)` | Merge two configs |

### Default workspace config

New workspaces get a filesystem MCP server:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."],
      "transport": "stdio",
      "enabled": true
    }
  },
  "version": "1.0"
}
```

### Template references

Workspace configs can reference platform-level templates instead of inlining the full server config:

```json
{
  "templateReferences": {
    "postgres": {
      "templateName": "postgres",
      "enabled": true,
      "customEnv": { "DATABASE_URL": "postgres://..." }
    }
  }
}
```

`resolveTemplateReferences()` expands these into full server configs at runtime.

---

## Presets System

**File:** `src/infrastructure/config/mcp-presets.ts`

Presets are pre-configured MCP server definitions. Users provide credentials; the platform supplies the command, args, and transport.

### Preset categories

| Category | Description |
|----------|-------------|
| `analytics` | Google Analytics |
| `database` | PostgreSQL, MySQL, Supabase |
| `developer` | GitHub, Linear, Sentry, Figma, Miro |
| `ecommerce` | Shopify Dev, Stripe |
| `communication` | Slack, Twilio |
| `storage` | Google Drive, Dropbox, Airtable |
| `search` | (reserved) |
| `utility` | Asana, Monday.com, Zendesk, HubSpot, Notion, Datadog |
| `cloud` | Atlassian (Jira, Confluence, Compass) |

### Available presets

| Preset ID | Name | Category |
|-----------|------|----------|
| `google-analytics` | Google Analytics | analytics |
| `shopify-dev` | Shopify Dev | ecommerce |
| `supabase` | Supabase | database |
| `atlassian` | Atlassian (Jira, Confluence, Compass) | cloud |
| `linear` | Linear | developer |
| `hubspot` | HubSpot CRM | utility |
| `notion` | Notion | utility |
| `github` | GitHub | developer |
| `slack` | Slack | communication |
| `stripe` | Stripe | ecommerce |
| `postgres` | PostgreSQL | database |
| `google-drive` | Google Drive | storage |
| `asana` | Asana | utility |
| `sentry` | Sentry | developer |
| `figma` | Figma | developer |
| `airtable` | Airtable | storage |
| `zendesk` | Zendesk | utility |
| `monday` | Monday.com | utility |
| `datadog` | Datadog | utility |
| `twilio` | Twilio | communication |
| `dropbox` | Dropbox | storage |
| `mysql` | MySQL | database |
| `miro` | Miro | developer |

### Preset structure

```typescript
interface MCPPreset {
  name: string
  description: string
  icon: string
  category: string
  command: string
  args: string[]
  transport?: 'stdio' | 'http' | 'sse'
  env_schema: Record<string, EnvVariable>   // Required credentials
  authType?: 'oauth' | 'oauth_pkce'        // OAuth if needed
  oauth?: { remoteUrl: string }             // OAuth discovery URL
  authInstructions?: string                 // Human-readable setup guide
}
```

### Adding a server from a preset

```typescript
const manager = new EnhancedMCPConfigManager()
await manager.addServerFromPreset('github', {
  GITHUB_PERSONAL_ACCESS_TOKEN: 'ghp_...'
})
```

The method validates required env vars against the preset's `env_schema`, substitutes placeholders in args, and saves the server config.

---

## OAuth Flow for MCP Servers

**Service:** `MCPOAuthService` (`src/domains/mcp/service/mcp-oauth.service.ts`)
**Direct flow:** `mcp-oauth-direct.service.ts`
**State file:** `{workspacePath}/.mcp-oauth-state.json`

Some MCP servers (Notion, Atlassian, Sentry, etc.) require OAuth authorization.

### Two strategies

| Strategy | When used | How it works |
|----------|-----------|--------------|
| Direct (preferred) | Server preset has `oauth.remoteUrl` | Server-side OAuth 2.1 + PKCE flow via `mcp-oauth-direct.service.ts` |
| Legacy mcp-remote | No `remoteUrl` configured | Spawns `mcp-remote` subprocess, captures auth URL from stdout/stderr |

### Flow

1. Frontend calls `POST /api/workspaces/{id}/mcp/{serverName}/oauth/initiate`
2. `MCPOAuthService.initiateOAuth()` selects strategy and returns `authorizationUrl`
3. User opens URL in browser, completes authorization
4. OAuth callback hits the backend, tokens are stored
5. `markAuthorized()` updates `.mcp-oauth-state.json`

### OAuth state per server

```json
{
  "version": "1.0",
  "servers": {
    "notion": {
      "status": "authorized",
      "authorizedAt": "2025-01-01T00:00:00Z"
    }
  }
}
```

Possible statuses: `pending`, `authorized`, `expired`, `error`, `not_required`.

---

## User MCP Templates

Users can save personal MCP server configurations as reusable templates.

**Storage:** `storage/users/{userId}/mcp-templates.json`

| Method | Description |
|--------|-------------|
| `getUserMCPTemplates(userId)` | List saved templates |
| `addUserMCPTemplate(userId, name, config)` | Save a template |
| `removeUserMCPTemplate(userId, name)` | Delete a template |
| `activateUserTemplateInWorkspace(userId, name, workspacePath)` | Add template to workspace as enabled server |

### API routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/user-mcp-templates` | GET | List user's templates |
| `/api/user-mcp-templates` | POST | Save a new template |
| `/api/user-mcp-templates/{name}` | DELETE | Remove a template |

---

## Built-in Tool Servers

`src/tools/mcp-tool-server-factory.ts` creates isolated MCP server instances per execution. These are in-process `McpServer` instances (no subprocess).

| Server | File | Tools provided |
|--------|------|----------------|
| `email-tools` | `src/tools/agents/email-tools.ts` | `email_send`, `email_list`, `email_read`, `email_reply` |
| `sqlite-tools` | `src/tools/sqlite-tools.ts` | `create_database`, `sqlite_query`, `sqlite_execute`, `sqlite_schema`, `list_databases`, `export_table` |
| `integration-channel-tools` | `src/tools/integration-channel-tools.ts` | `send_slack_message`, `send_discord_message` |
| `google-ai-tools` | `src/tools/agents/google-ai-tools.ts` | Google AI / Gemini |
| `whatsapp-tools` | `src/tools/agents/whatsapp-tools.ts` | `send_whatsapp_message`, `send_whatsapp_image`, `send_whatsapp_document`, etc. |
| `agent-management-tools` | `src/tools/agents/agent-management-tools.ts` | Agent CRUD from within agent executions |
| `agent-chat-tools` | `src/tools/agents/agent-chat-tools.ts` | `ask_agent` (lightweight Q&A), `delegate_task` (full execution with tools) |
| `browser-tools` | `src/tools/agents/browser-tools.ts` | Headless browser automation |
| `discord-management-tools` | `src/tools/discord-management-tools.ts` | Discord channel/role CRUD |
| `v0-tools` | `src/tools/agents/v0-tools.ts` | V0 UI generation (lazarus agent only) |

### Why per-execution instances?

`McpServer.connect(transport)` overwrites the internal transport reference. Sharing a singleton across concurrent executions causes tool calls to route to the wrong session. Each `query()` call gets fresh server instances.

### Execution context

Tool handlers read agent/workspace context from `AsyncLocalStorage` via `runInExecutionContext()`, avoiding environment variable mutation and enabling safe concurrent executions.

---

## Key Files

| File | Purpose |
|------|---------|
| `src/infrastructure/config/mcp-enhanced.ts` | Global MCP config manager |
| `src/infrastructure/config/mcp-presets.ts` | Preset definitions and categories |
| `src/domains/mcp/service/mcp-config-manager.ts` | Workspace MCP config (`.mcp.config.json` / `.mcp.json`) |
| `src/domains/mcp/service/mcp-oauth.service.ts` | OAuth flow orchestration |
| `src/domains/mcp/service/mcp-oauth-direct.service.ts` | Direct OAuth 2.1 + PKCE implementation |
| `src/domains/mcp/controller/mcp.controller.ts` | Global MCP API routes |
| `src/domains/mcp/controller/workspace-mcp.controller.ts` | Workspace MCP API routes |
| `src/domains/mcp/controller/user-mcp.controller.ts` | User template API routes |
| `src/domains/mcp/types/mcp.types.ts` | MCP type definitions |
| `src/tools/mcp-tool-server-factory.ts` | Per-execution tool server factory |
| `src/tools/agents/` | Individual tool server implementations |
