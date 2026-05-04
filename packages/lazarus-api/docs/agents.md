# Agent System

## Overview

Agents are AI executors stored as files within workspaces. Each agent has a configuration file, an inbox, triggers, and optional personal directories. Agents are powered by the Claude SDK via `workspace-agent-executor.ts`.

**Storage layout:**

```
{workspacePath}/
  .agents.json                          # Agent index (quick listing)
  .agents/
    {agentId}/
      config.agent.json                 # Agent configuration
      inbox/                            # Email inbox
        attachments/
      triggers/                         # Trigger definitions (one JSON per trigger)
        email-auto-trigger.json
      whatsapp/                         # WhatsApp message storage
      executions/                       # Execution history
```

---

## Agent CRUD

All operations go through `WorkspaceAgentService` (`src/domains/agent/service/workspace-agent.service.ts`).

| Operation | Method | Notes |
|-----------|--------|-------|
| Create | `createAgent(workspaceId, userId, config)` | Creates directory structure, provisions email, writes config, updates index |
| Read | `getAgent(workspaceId, userId, agentId)` | Self-heals email address and guardrails on read |
| Update | `updateAgent(workspaceId, userId, agentId, updates)` | System agents only allow `triggers` and `enabled` updates |
| Delete | `deleteAgent(workspaceId, userId, agentId)` | Blocks deletion of system agents. Cleans up WhatsApp phone config |
| List | `listAgents(workspaceId, userId, includeSystem?)` | Reads from `.agents.json` index for fast listing |
| Enable/Disable | `updateAgent(...)` with `{ enabled: true/false }` | Toggled via the `enabled` field |

On creation, the service automatically:
- Provisions an email address: `{agentId}@{workspaceSlug}.lazarusconnect.com`
- Creates an `inbox/` directory
- Creates an email auto-trigger in `triggers/` (unless `autoTriggerEmail` is false)
- Updates the `.agents.json` index

### System agents

Every workspace gets a `lazarus` agent created first (via `initializeSystemAgents`). Additional agents come from workspace templates. System agents have `metadata.isSystemAgent: true` and cannot be deleted or have their core fields modified.

---

## Agent Configuration Structure

`config.agent.json` follows the `WorkspaceAgentConfig` interface:

```jsonc
{
  "id": "my-agent",
  "name": "My Agent",
  "description": "Does things",
  "systemPrompt": "You are a helpful assistant...",
  "allowedTools": ["*"],          // or specific tool names
  "enabled": true,

  "modelConfig": {
    "model": "sonnet",            // Claude model identifier
    "temperature": 0.3,
    "maxTokens": 4096
  },

  // Optional: guardrails restricting tool usage
  "guardrails": [
    { "category": "file_operations", "level": "ask_first" }
  ],

  // Optional: per-agent MCP servers (override workspace MCPs)
  "mcpServers": { },
  "activeMCPs": ["postgres"],     // Subset of workspace MCPs to enable

  // Optional: personal file directories
  "personalFiles": {
    "scriptsDir": "scripts",
    "promptsDir": "prompts",
    "dataDir": "data"
  },

  // Auto-provisioned email
  "email": {
    "address": "my-agent@workspace-slug.lazarusconnect.com",
    "enabled": true,
    "restrictToWorkspaceMembers": true,
    "allowedExternalEmails": []
  },

  // Optional: WhatsApp integration
  "whatsapp": {
    "enabled": true,
    "autoTriggerOnMessage": true,
    "restrictToContacts": false
  },

  // Optional: permission approval channel
  "permissionChannel": {
    "enabled": true,
    "platform": "whatsapp",       // whatsapp | discord | email | slack
    "phoneNumberId": "...",
    "targetPhone": "..."
  },

  "metadata": {
    "created": "2025-01-01T00:00:00Z",
    "updated": "2025-01-01T00:00:00Z",
    "author": "user-uuid",
    "tags": ["research"],
    "isSystemAgent": false,
    "workspaceId": "ws_xxx",
    "userId": "user-uuid"
  }
}
```

---

## Trigger Types

Triggers are stored as JSON files in `.agents/{agentId}/triggers/`. The `AgentTriggerConfig` interface defines the on-disk format; the full `AgentTrigger` type adds runtime fields.

| Type | Config Interface | How it fires |
|------|-----------------|--------------|
| `email` | `EmailTriggerConfig` | `email-router.controller.ts` reads triggers from disk on inbound email |
| `scheduled` | `ScheduledTriggerConfig` | Cron/interval/one-shot via `TriggerInitializationService` and `node-cron` |
| `webhook` | `WebhookTriggerConfig` | External HTTP POST to `/api/workspaces/{id}/agents/{id}/triggers/{id}/execute` |
| `whatsapp` | `WhatsAppTriggerConfig` | `whatsapp-router.controller.ts` matches incoming messages against trigger conditions |
| `file_change` | `FileChangeTriggerConfig` | Monitors workspace file paths for create/modify/delete events |

### Trigger condition matching

Email and WhatsApp triggers support conditions:

**Email:** `from`, `subject`, `priority`, `keywords`
**WhatsApp:** `fromNumbers`, `containsKeywords`, `messageTypes`

If no conditions are specified, the trigger fires on every matching event.

### Trigger file format

```json
{
  "id": "email-auto-trigger",
  "name": "Email trigger",
  "type": "email",
  "enabled": true,
  "config": {
    "event": "email_received",
    "description": "Process incoming emails",
    "task": "Optional: specific instructions for handling this trigger"
  }
}
```

---

## Agent Execution Lifecycle

`WorkspaceAgentExecutor.executeAgent()` is the central execution method. Here is the step-by-step flow:

1. **Load agent config** from `config.agent.json` via `WorkspaceAgentService.getAgent()`
2. **Load workspace** via `WorkspaceManager.getWorkspace()`
3. **Register execution** in `executionCache` with a unique `executionId`
4. **Create activity log** (status: `executing`) via `ActivityService`
5. **Create execution tracker** for realtime WebSocket updates
6. **Build system prompt:**
   - Wrap agent's `systemPrompt` with the Lazarus identity pre-prompt (`wrapWithLazarusIdentity`)
   - Append workspace context (name, path, slug)
   - Append agent email address and available sibling agents
   - Append tool descriptions and current task
7. **Build MCP configuration:**
   - Agent-specific MCP servers (from `config.agent.json`)
   - Workspace MCP servers (from `.mcp.config.json`)
   - Custom in-process tool servers (email-tools, sqlite-tools, browser-tools, etc.)
8. **Compute guardrails:**
   - `getDisallowedTools()` -- tools that are always blocked
   - `getAskFirstTools()` -- tools that require user approval
9. **Build channel permission context** for approval notifications (WhatsApp, Discord, Slack)
10. **Create workspace sandbox** restricting file access to workspace directory
11. **Execute Claude SDK `query()`** with:
    - `mcpServers`: merged custom + workspace MCP servers
    - `maxTurns`: configurable (default from `MAX_TURNS.executor`)
    - `cwd`: workspace path
    - `model`: from agent's `modelConfig.model`
    - `permissionMode: 'default'` with `PreToolUse` hooks
    - `sandbox.enabled: true`
    - `settingSources: ['user', 'project']` (loads skills from `$HOME/.claude/skills/` and `{cwd}/.claude/skills/`)
12. **Stream messages** via `onMessage` callback -- track assistant text, tool calls, token usage
13. **Record activity** -- messages, tool calls, final result
14. **Usage report** -- write token totals to the shared Redis stream `usage:events`; the orchestrator drains it and decrements credits
15. **Cleanup** -- clear timers, deregister abort controller

### Timeouts

| Timeout | Duration | Behavior |
|---------|----------|----------|
| Execution timeout | 20 minutes | Aborts via `AbortController` |
| Inactivity timeout | 15 minutes | Aborts if no SDK messages received |
| Approval wait | Indefinite | Inactivity timer suspended during approval waits |

### Execution context

`runInExecutionContext()` uses `AsyncLocalStorage` to inject per-execution variables (agentId, workspaceId, etc.) so in-process tool servers can read the correct context without environment variable mutation.

---

## Permission / Approval System

### Risk Assessment

`src/domains/permission/service/risk-assessment.ts` classifies tool calls:

| Classification | Behavior |
|----------------|----------|
| Auto-deny | Destructive Bash commands (`rm -rf /`, `dd`, fork bombs) |
| Requires approval | `mcp__email-tools__email_send` (outbound email) |
| Auto-approve | Everything else |

### Guardrails

Agents can have `guardrails` in their config. Each guardrail maps tool categories to permission levels:

- `always_allowed` -- auto-approve
- `ask_first` -- create persistent approval, pause execution
- `never_allowed` -- block immediately

### PreToolUse Hook

The executor registers a `PreToolUse` hook that runs before every tool invocation:

1. Check sandbox (file path within workspace)
2. Check `askFirstTools` set -- if match, create persistent approval
3. Check dynamic guardrail classification
4. Run safety assessment (auto-deny destructive commands)
5. Default: allow

### Persistent Approvals

When an `ask_first` tool is invoked:

1. `BackgroundPermissionManager.registerPersistent()` writes to the `approvals` database table
2. Emits `approval:requested` WebSocket event for the frontend dashboard
3. Optionally sends notification via channel provider (WhatsApp, Discord, Slack)
4. Execution pauses (the Promise blocks the SDK loop)
5. User approves/denies from web dashboard OR channel response
6. `BackgroundPermissionManager.resolve()` unblocks the execution

### Channel Providers

`src/domains/permission/service/channel-permission-bridge.ts` selects the provider:

| Platform | Provider | Status |
|----------|----------|--------|
| WhatsApp | `WhatsAppPermissionProvider` | Production |
| Discord | Planned | Not yet implemented |
| Slack | Planned | Not yet implemented |
| Email | Planned | Not yet implemented |

Priority: Agent's configured `permissionChannel` first, then the originating platform.

WhatsApp sends interactive buttons (`Approve` / `Deny`) and also supports text fallback (`yes`/`no`).

---

## System Prompts

### Lazarus Identity Pre-Prompt

`src/infrastructure/config/system-prompts.ts` defines the immutable `LAZARUS_PREPROMPT` injected into every agent execution. It establishes:

- Lazarus brand identity and communication style
- Workspace file conventions (naming, directory structure)
- SQLite database usage rules
- Agent communication tools (`ask_agent`, `delegate_task`)
- File path requirements (relative paths only)
- Script organization (`/scripts/` for TS, `/py_scripts/` for Python)

### Prompt Loader

`src/prompts/prompt-loader.ts` loads system prompts from markdown files:

```typescript
import { loadPrompt, loadPromptCached } from '@prompts'

const prompt = await loadPromptCached('agents/main-agent')
```

- Prompts are `.md` files in `src/prompts/`
- YAML frontmatter is automatically stripped
- Results are cached in memory (`loadPromptCached`)
- `listPrompts()` returns available prompts from `agents/` and `specialists/` subdirectories

### Prompt Assembly Order

1. Lazarus identity pre-prompt (immutable)
2. Agent's `systemPrompt` from config
3. Workspace context (name, path, available agents)
4. Communication tools reference
5. Personal files context
6. Current task

---

## MCP Tool Configuration Per Agent

Agents can configure MCP servers at two levels:

### Agent-level MCP

Set `mcpServers` in `config.agent.json` to define servers specific to this agent:

```json
{
  "mcpServers": {
    "custom-db": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgres://..."],
      "enabled": true
    }
  }
}
```

### Workspace-level MCP filtering

Set `activeMCPs` to select a subset of the workspace's MCP servers:

```json
{
  "activeMCPs": ["postgres", "github"]
}
```

If `activeMCPs` is empty or absent, and the agent's `allowedTools` includes `"mcp"` or `"*"`, all workspace MCP servers are included.

### Built-in Tool Servers

Every agent execution gets these in-process MCP tool servers (created fresh per execution via `mcp-tool-server-factory.ts`):

| Server | Tools |
|--------|-------|
| `email-tools` | `email_send`, `email_list`, `email_read`, `email_reply` |
| `sqlite-tools` | `create_database`, `sqlite_query`, `sqlite_execute`, `sqlite_schema`, `list_databases`, `export_table` |
| `integration-channel-tools` | `send_slack_message`, `send_discord_message` |
| `google-ai-tools` | Google AI / Gemini integration |
| `whatsapp-tools` | `send_whatsapp_message`, `send_whatsapp_image`, etc. |
| `agent-management-tools` | Agent CRUD from within executions |
| `agent-chat-tools` | `ask_agent`, `delegate_task` |
| `browser-tools` | Headless browser / web automation |
| `discord-management-tools` | Discord channel/role management |
| `v0-tools` | V0 integration (lazarus agent only) |

---

## Key Files

| File | Purpose |
|------|---------|
| `src/domains/agent/service/workspace-agent.service.ts` | Agent CRUD, index management, template initialization |
| `src/domains/agent/service/workspace-agent-executor.ts` | Core execution engine (Claude SDK integration) |
| `src/domains/agent/service/triggers/trigger-manager.ts` | Trigger creation, scheduling, execution |
| `src/domains/agent/service/triggers/prompt-builders.ts` | Platform-specific trigger prompt construction |
| `src/domains/agent/service/config-manager.ts` | Legacy agent config management |
| `src/domains/agent/service/activity-logger.ts` | Execution activity recording |
| `src/domains/agent/service/agent-lookup.service.ts` | Agent validation for email routing |
| `src/domains/agent/service/execution-abort-registry.ts` | AbortController registry for cancellation |
| `src/domains/agent/types/agent.types.ts` | `WorkspaceAgentConfig`, `AgentTriggerConfig`, `AgentStatus` |
| `src/domains/agent/types/trigger.types.ts` | `AgentTrigger`, trigger config interfaces |
| `src/domains/permission/service/background-permission-manager.ts` | Persistent approval registry |
| `src/domains/permission/service/risk-assessment.ts` | Tool risk classification |
| `src/domains/permission/service/channel-permission-bridge.ts` | Channel provider selection |
| `src/domains/permission/service/sandbox.ts` | Workspace file access sandbox |
| `src/domains/permission/service/sandbox-hook.ts` | PreToolUse sandbox enforcement |
| `src/infrastructure/config/system-prompts.ts` | Lazarus identity pre-prompt |
| `src/prompts/prompt-loader.ts` | Markdown prompt file loader |
| `src/tools/mcp-tool-server-factory.ts` | Per-execution MCP tool server factory |
