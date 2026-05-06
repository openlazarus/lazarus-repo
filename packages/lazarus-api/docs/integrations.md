# Platform Integrations

## Overview

Lazarus integrates with four external communication platforms. Each integration receives messages, routes them to the appropriate workspace agent, executes the agent, and sends the response back through the originating platform.

| Platform | Inbound | Outbound | Permission Approvals |
|----------|---------|----------|---------------------|
| Slack | Events API (webhooks) | Web API (`@slack/web-api`) | Planned |
| Discord | Interactions endpoint | REST API + follow-up webhooks | Planned |
| WhatsApp | Kapso webhooks | Kapso API (WhatsApp Cloud) | Production (buttons + text) |
| Email | SES -> S3 -> Lambda -> webhook | SES sender | N/A |

---

## Slack

### Key files

| File | Purpose |
|------|---------|
| `src/domains/slack/controller/slack-webhook.controller.ts` | Webhook handlers (events, commands, interactivity) |
| `src/domains/slack/service/slack.service.ts` | Connection management, message processing, agent execution |
| `src/domains/slack/repository/slack.repository.ts` | Database persistence (Supabase `slack_connections` table) |
| `src/domains/slack/types/slack.types.ts` | Type definitions |

### Webhook endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/slack/events` | POST | Slack Events API (messages, mentions, app_home_opened) |
| `/api/slack/commands` | POST | Slash command handler |
| `/api/slack/interactivity` | POST | Block actions, view submissions, shortcuts |

### Event types handled

| Event | Handler | Behavior |
|-------|---------|----------|
| `url_verification` | Inline | Returns `challenge` for Slack URL verification |
| `app_mention` | `handleAppMention` | Cleans mention text, creates `SlackMessage`, calls `processMessage` |
| `message` (DM) | `handleDirectMessage` | Only processes non-bot DMs (`channel_type === 'im'`) |
| `app_home_opened` | Logged | No action |

Events are acknowledged with 200 immediately (Slack requires response within 3 seconds), then processed asynchronously.

### Slash commands

| Command | Behavior |
|---------|----------|
| `/lazarus` | Acknowledges and processes the message |
| `/lazarus-status` | Returns connection info (workspace, agent, enabled status) |

### Interactivity

| Type | Handler |
|------|---------|
| `block_actions` | Dispatches to action handlers by `action_id` prefix |
| `view_submission` | Clears the modal |
| `shortcut` | Acknowledged (no-op) |
| `message_action` | Acknowledged (no-op) |

Block action handlers:

| Action ID prefix | Behavior |
|-----------------|----------|
| `confirm` | Sends "Confirmed!" replacement message |
| `cancel` | Sends "Cancelled." replacement message |
| `stop_execution:{executionId}` | Aborts running agent execution (only by triggering user) |

### Message processing flow

1. Look up `SlackConnection` by Slack team ID
2. Check `shouldRespond()` against connection settings (mentions, DMs, channel whitelist/blacklist)
3. **Credit guard** -- read `credits:{workspaceId}` from shared Redis (set by orchestrator); short-circuit with a "credits exhausted" reply if zero
4. Get or create conversation context (thread-based)
5. Process file attachments (download via bot token, store in workspace)
6. Store incoming message in conversation history
7. Build task context (conversation history + message + attachments + reply instructions)
8. Execute agent via `WorkspaceAgentExecutor.executeAgent()` with:
   - `platformSource: 'slack'`
   - `platformMetadata: { channelId, threadId, guildId, userName, userId }`
9. Send "Thinking..." status message with Stop button
10. Stream agent response, send final text to Slack thread
11. **Usage report** -- write the LLM token tally to the Redis stream `usage:events`; the orchestrator drains it and decrements credits asynchronously
12. Update conversation metadata

### Connection settings

```typescript
interface SlackConnectionSettings {
  conversationTimeoutMinutes?: number
  respondToMentions?: boolean      // Default: true
  respondToDMs?: boolean           // Default: true
  useThreads?: boolean
  channelWhitelist?: string[]      // Only respond in these channels
  channelBlacklist?: string[]      // Never respond in these channels
}
```

---

## Discord

### Key files

| File | Purpose |
|------|---------|
| `src/domains/discord/controller/discord-webhook.controller.ts` | Interaction handler (slash commands, components, autocomplete) |
| `src/domains/discord/controller/discord-settings.controller.ts` | Guild settings management |
| `src/domains/discord/service/discord.service.ts` | Connection management, message processing |
| `src/domains/discord/service/discord-bot.ts` | Bot client management |
| `src/domains/discord/service/discord-permissions-builder.ts` | Builds Discord permissions integer from settings |
| `src/domains/discord/repository/discord.repository.ts` | Database persistence |
| `src/domains/discord/types/discord.types.ts` | Type definitions |

### Webhook endpoint

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/discord/interactions` | POST | Discord Interactions endpoint (all interaction types) |

All Discord interactions go through a single endpoint. Requests are verified using Ed25519 signature verification (`discord-interactions` library).

### Interaction types handled

| Type | Constant | Handler |
|------|----------|---------|
| PING (1) | `InteractionType.PING` | Returns PONG |
| APPLICATION_COMMAND (2) | `InteractionType.APPLICATION_COMMAND` | Dispatches to slash command handlers |
| MESSAGE_COMPONENT (3) | `InteractionType.MESSAGE_COMPONENT` | Dispatches to component handlers |
| APPLICATION_COMMAND_AUTOCOMPLETE (4) | `InteractionType.APPLICATION_COMMAND_AUTOCOMPLETE` | Returns empty choices (placeholder) |

### Slash commands

| Command | Behavior |
|---------|----------|
| `/lazarus {message}` | Defers response, processes message asynchronously, sends follow-up |
| `/lazarus-status` | Returns connection info (ephemeral) |
| `/lazarus-agent {agent}` | Switches the active agent for the guild |

Slash command messages are processed via `discordService.processMessage()`, which follows the same pattern as Slack: look up connection, check credits via the shared Redis key, execute agent, send response.

### Component handlers

| Custom ID prefix | Behavior |
|-----------------|----------|
| `confirm` | Updates message to "Confirmed!" |
| `cancel` | Updates message to "Cancelled." |
| `stop_execution:{executionId}` | Aborts agent execution (only by triggering user) |

### Guild settings management

`discord-settings.controller.ts` exposes endpoints for managing per-guild Discord settings:

```typescript
interface DiscordConnectionSettings {
  conversationTimeoutMinutes?: number
  respondToMentions?: boolean
  respondToDMs?: boolean
  useThreads?: boolean
  channelWhitelist?: string[]
  channelBlacklist?: string[]
  interactionAccess?: {
    allowedBy: 'everyone' | 'roles'
    roleIds?: string[]
  }
  managementCapabilities?: Record<DiscordManagementCapability, CapabilityConfig>
}
```

Management capabilities control what the bot can do on the server:

| Capability | Description |
|------------|-------------|
| `channel_create` | Create channels |
| `channel_delete` | Delete channels |
| `channel_modify` | Modify channel settings |
| `role_create` | Create roles |
| `role_delete` | Delete roles |
| `role_modify` | Modify role settings |
| `role_assign` | Assign roles to members |

Each capability has `enabled`, `allowedBy` ('everyone' or 'roles'), and optional `roleIds`.

---

## WhatsApp

### Key files

| File | Purpose |
|------|---------|
| `src/domains/whatsapp/controller/whatsapp-router.controller.ts` | Webhook handler (messages, statuses, account updates) |
| `src/domains/whatsapp/controller/whatsapp-global.controller.ts` | Global WhatsApp agent (onboarding) |
| `src/domains/whatsapp/service/kapso-service.ts` | Kapso API client (WhatsApp Cloud API wrapper) |
| `src/domains/whatsapp/service/whatsapp-queue.service.ts` | Message processing queue (serializes per agent) |
| `src/domains/whatsapp/service/whatsapp-send-utils.ts` | Message sending utilities |
| `src/domains/whatsapp/service/audio-transcription.service.ts` | Audio message transcription |
| `src/domains/whatsapp/repository/agent-whatsapp-storage.ts` | Message storage (filesystem) |
| `src/domains/whatsapp/repository/whatsapp-phone.repository.ts` | Phone number config (database) |
| `src/domains/whatsapp/types/whatsapp.types.ts` | Type definitions |

### Webhook endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/whatsapp/webhook` | GET | Webhook verification (`hub.mode`, `hub.verify_token`, `hub.challenge`) |
| `/api/whatsapp/webhook` | POST | Inbound messages, status updates, account updates |
| `/api/whatsapp/health` | GET | Health check |

### Webhook signature verification

Uses HMAC-SHA256 with `KAPSO_WEBHOOK_SECRET` from the `x-hub-signature-256` header.

### Message routing flow

1. Parse webhook event via `kapsoService.parseWebhookEvent()`
2. Extract messages and statuses
3. For each message:
   a. Look up agent by `phoneNumberId` via `whatsAppPhoneRepository.getPhoneConfigForWebhook()`
   b. **Permission button check** -- if message is an interactive button reply (`perm_approve_*` / `perm_deny_*`), resolve the pending approval via `BackgroundPermissionManager` and return
   c. **Text permission fallback** -- if there is a pending approval for this channel, check for `yes`/`no` text responses
   d. Load workspace and agent config
   e. Deduplicate (skip if message ID already stored)
   f. Process by message type (see table below)
   g. Save to filesystem via `agentWhatsAppStorage`
   h. Create activity log
   i. Broadcast WebSocket event (`whatsapp_message_received`)
   j. Enqueue for trigger execution via `whatsappQueue`

### Message type handlers

| Type | Handler | Behavior |
|------|---------|----------|
| `text` | Inline | Extracts `message.text.body` |
| `image` | `loadInboundMediaContent` | Downloads via Kapso, saves to storage |
| `document` | `loadInboundMediaContent` | Downloads via Kapso, saves to storage |
| `audio` | `loadInboundMediaContent` | Downloads, saves, transcribes via `audioTranscriptionService` |
| `video` | `loadInboundMediaContent` | Downloads via Kapso, saves to storage |
| `sticker` | `loadInboundMediaContent` | Downloads via Kapso, saves to storage |
| `location` | No-op | Stored as location metadata |
| `contacts` | No-op | Stored as contacts metadata |

### Trigger execution

`executeWhatsAppTriggers()` runs after message storage:

1. Read `triggers.json` from agent directory
2. Filter for `type: 'whatsapp'` and `enabled: true`
3. Evaluate conditions (`fromNumbers`, `containsKeywords`, `messageTypes`)
4. Execute matching triggers via `AgentTriggerManager.executeAgentTrigger()`
5. Mark message as read

### Permission approval buttons

When an agent execution needs tool approval, `WhatsAppPermissionProvider` sends interactive buttons:

```
Agent "my-agent" needs permission:
Send email to user@example.com: "Monthly Report"
Risk: medium

[Approve] [Deny]
```

The user taps a button. The webhook receives an `interactive.button_reply` with ID `perm_approve_{requestId}` or `perm_deny_{requestId}`, which resolves the pending approval.

Text fallback also works: if the user types `yes`, `y`, `approve`, `ok` (approve) or `no`, `n`, `deny`, `reject` (deny) while a permission request is pending for their channel.

---

## Email

### Key files

| File | Purpose |
|------|---------|
| `src/domains/email/controller/email-router.controller.ts` | Inbound email webhook handler |
| `src/domains/email/service/s3-email-fetcher.ts` | Fetches raw email from S3, parses with `mailparser` |
| `src/domains/email/service/ses-email-sender.ts` | Sends outbound email via SES |
| `src/domains/email/service/email-conversation.service.ts` | Email threading (In-Reply-To, References headers) |
| `src/domains/email/repository/agent-email-storage.ts` | Email storage (filesystem) |
| `src/domains/email/repository/email-conversation.repository.ts` | Conversation persistence (database) |
| `src/domains/email/types/email.types.ts` | Type definitions |

### Webhook endpoint

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/email/route` | POST | SES Lambda webhook -- routes inbound email to agent |
| `/api/email/health` | GET | Health check |

### Inbound email flow

```
Sender -> {agentId}@{workspaceSlug}.lazarusconnect.com
  -> AWS SES receives email
  -> SES stores raw email in S3
  -> Lambda extracts metadata (messageId, to, from, subject)
  -> Lambda POST /api/email/route with metadata
  -> Backend processes
```

### Email routing steps

1. **Parse recipient** -- extract `agentId` and `workspaceSlug` from `{agentId}@{workspaceSlug}.lazarusconnect.com`
2. **Look up workspace** by slug via `workspaceRepository.getWorkspaceBySlug()`
3. **Validate agent** exists and is enabled via `agentLookupService.getAgentMetadata()`
4. **Authorization check** -- for external senders:
   - Load agent email auth config (`restrictToWorkspaceMembers`, `allowedExternalEmails`)
   - Verify sender is a workspace member or on the allowed list
   - Internal senders (`@lazarusconnect.com`) skip authorization
   - Fails open (allows email through if auth check errors)
5. **Fetch email from S3** via `s3EmailFetcher.fetchAndParseEmail(messageId)`
   - Parses text content, HTML content, attachments
   - Extracts threading headers (In-Reply-To, References, Message-ID)
6. **Deduplicate** -- skip if `messageId` already exists in storage
7. **Save to agent inbox** via `agentEmailStorage.saveIncomingEmail()`
8. **Thread conversation** via `emailConversationService.getOrCreateConversation()`
   - Uses `In-Reply-To` and `References` headers to find existing threads
   - Falls back to subject-based matching
9. **Create activity log** (status: executing)
10. **Broadcast WebSocket** event (`email_received`)
11. **Find and execute triggers:**
    - Read from `triggers/` directory (individual JSON files)
    - Fallback to `triggers.json` (legacy format)
    - If no triggers found but `autoTriggerEmail` is enabled, synthesize a catch-all trigger
    - If multiple triggers have `config.task`, combine them into a single consolidated prompt
    - Execute via `AgentTriggerManager.executeAgentTrigger()`
12. **Credit check** -- if `credits:{workspaceId}` is zero, send reply email with a credits-exhausted notification instead of executing
13. **Mark email as read** after successful trigger execution

### Email address format

```
{agentId}@{workspaceSlug}.lazarusconnect.com
```

Examples:
- `lazarus@my-workspace.lazarusconnect.com`
- `researcher@acme-corp.lazarusconnect.com`

### Outbound email

Agents send email via the `email_send` tool (from `email-tools` MCP server), which uses `SESEmailSender`. Reply threading is handled by `email-conversation.service.ts` setting the correct `In-Reply-To` and `References` headers.

---

## Common Patterns Across Integrations

### Credits and usage

The orchestrator owns billing. This API only enforces the contract via shared Redis:

1. **Pre-check** -- read `credits:{workspaceId}` from Redis (set by orchestrator). Zero blocks execution; a missing key fails open
2. **Execute** -- run agent, track token usage in the runtime tracer
3. **Usage report** -- write the per-call token tally to the Redis stream `usage:events`. The orchestrator drains that stream, deducts credits, and republishes the new `credits:{workspaceId}` value

### Activity logging

All integrations create activity logs with:
- `platformSource`: `'slack'` | `'discord'` | `'email'` | `'whatsapp'`
- `conversationTitle`: auto-generated from message content
- `platformMetadata`: platform-specific IDs (channelId, threadId, etc.)

### Conversation tracking

Slack and Discord use `ConversationDetector` for thread-based conversation management. Email uses `EmailConversationService` for header-based threading. WhatsApp tracks conversations per sender phone number.

### Agent execution

All integrations call `WorkspaceAgentExecutor.executeAgent()` with the same interface, differing only in `platformSource` and `platformMetadata` fields. The executor handles the Claude SDK integration, MCP tools, guardrails, and permission approvals regardless of the originating platform.
