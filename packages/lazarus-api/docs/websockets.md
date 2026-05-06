# WebSocket API

## Overview

The server exposes three WebSocket endpoints, all sharing the same underlying `ConnectionManager` for connection pooling and scoped broadcasting. The `/ws/workspace` endpoint is recommended for new clients; the other two are backward-compatible alternatives.

Source files:

- `src/realtime/websocket/server.ts` -- HTTP upgrade routing, endpoint handlers
- `src/realtime/websocket/connection-manager.ts` -- Connection pool, scoped broadcast, heartbeat
- `src/realtime/events/event-bus.ts` -- Internal event pub/sub
- `src/realtime/events/broadcasters/` -- Event-to-WebSocket bridges
- `src/realtime/types.ts` -- All message type definitions

---

## Connection Endpoints

| Endpoint | Required Params | Optional Params | Event Filter |
|----------|----------------|-----------------|--------------|
| `/ws/workspace` | `userId` | `workspace`, `teamId` | None (all events) |
| `/ws/agents` | `userId` | `workspace`, `teamId` | Agent + execution events only |
| `/ws/files` | `userId`, `workspace` | `teamId` | File events only |

All parameters are passed as query strings on the WebSocket URL.

### Connection Examples

```
ws://localhost:8000/ws/workspace?userId=user-123&workspace=ws_abc&teamId=team-456
ws://localhost:8000/ws/agents?userId=user-123&workspace=ws_abc
ws://localhost:8000/ws/files?userId=user-123&workspace=ws_abc
```

### Parameter Notes

- `workspace` is validated to not be a UUID (to prevent accidentally passing a userId). UUIDs are silently ignored and the connection proceeds without workspace scoping.
- `/ws/files` requires both `userId` and `workspace`. Missing either will close the connection with code `1008`.
- `/ws/agents` requires `userId`. Workspace is optional (scopes agent events if provided).
- `/ws/workspace` requires `userId`. Workspace is optional (enables file watching if provided).

---

## Message Types

### Server -> Client Messages

#### Connection

Sent immediately after a successful connection.

```json
{
  "type": "connection:established",
  "workspace": "ws_abc",
  "timestamp": "2026-04-13T12:00:00.000Z",
  "message": "Connected to Lazarus realtime service"
}
```

#### Agent Events

```json
{
  "type": "agent:started",
  "agentId": "my-agent",
  "status": "executing",
  "metadata": {
    "title": "Processing email",
    "workspace": "ws_abc",
    "startedAt": "2026-04-13T12:00:00.000Z"
  },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

```json
{
  "type": "agent:progress",
  "agentId": "my-agent",
  "status": "executing",
  "metadata": {
    "taskId": "exec-456",
    "title": "Processing email",
    "description": "Parsing attachments",
    "progress": 50,
    "workspace": "ws_abc"
  },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

```json
{
  "type": "agent:stopped",
  "agentId": "my-agent",
  "status": "idle",
  "metadata": { "taskId": "exec-456" },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

```json
{
  "type": "agent:error",
  "agentId": "my-agent",
  "status": "error",
  "metadata": { "error": "API rate limit exceeded", "taskId": "exec-456" },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

```json
{
  "type": "agent:status",
  "agentId": "my-agent",
  "status": "awaiting_approval",
  "metadata": {},
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

Agent statuses: `idle`, `executing`, `paused`, `awaiting_approval`, `error`

#### Execution Events

```json
{
  "type": "execution:registered",
  "executionId": "exec-789",
  "agentId": "my-agent",
  "userId": "user-123",
  "workspaceId": "ws_abc",
  "status": "running",
  "metadata": { "title": "Email trigger", "triggerId": "email-auto-trigger" },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

Other execution types: `execution:updated`, `execution:completed`, `execution:failed`

#### File Events

```json
{
  "type": "file:created",
  "workspace": "ws_abc",
  "path": "documents/report.pdf",
  "fileType": "pdf",
  "size": 102400,
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

Other file types: `file:modified`, `file:deleted`

#### Workspace Events

```json
{
  "type": "workspace:updated",
  "workspaceId": "ws_abc",
  "changes": { "name": "New Name" },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

#### Team Events

```json
{
  "type": "team:updated",
  "teamId": "team-456",
  "changes": { "name": "New Team Name" },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

#### Activity Events

```json
{
  "type": "activity:new",
  "workspaceId": "ws_abc",
  "activityId": "act-001",
  "activityType": "agent_execution",
  "actorName": "Email Agent",
  "title": "Processed incoming email",
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

#### Approval Events

```json
{
  "type": "approval:requested",
  "approvalId": "apr-001",
  "workspaceId": "ws_abc",
  "agentId": "my-agent",
  "agentName": "Email Agent",
  "executionId": "exec-789",
  "toolName": "write_file",
  "description": "Write to /data/output.csv",
  "riskLevel": "high",
  "createdAt": "2026-04-13T12:00:00.000Z",
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

```json
{
  "type": "approval:resolved",
  "approvalId": "apr-001",
  "workspaceId": "ws_abc",
  "agentId": "my-agent",
  "executionId": "exec-789",
  "approved": true,
  "resolvedBy": "user-123",
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

---

### Client -> Server Messages

#### Ping

```json
{ "type": "ping" }
```

Server responds with:

```json
{ "type": "pong", "timestamp": "2026-04-13T12:00:00.000Z" }
```

This is the only client-to-server message type currently supported.

---

## Keep-Alive Protocol

Two layers of keep-alive are active:

| Mechanism | Interval | Purpose |
|-----------|----------|---------|
| ConnectionManager heartbeat | 30 seconds | Server-side dead connection cleanup. Removes connections not in `OPEN` state. |
| Application-level ping/pong | Client-initiated | Client sends `{"type":"ping"}`, server responds with `{"type":"pong"}`. |

The server also responds to WebSocket protocol-level ping frames with pong frames automatically.

---

## Initial State on Connect

When a client connects to `/ws/agents` or `/ws/workspace`, the server immediately sends the current state of all running executions matching the user/workspace scope. Each running execution is sent as an `agent:progress` message for backward compatibility:

```json
{
  "type": "agent:progress",
  "agentId": "my-agent",
  "status": "executing",
  "metadata": {
    "taskId": "exec-789",
    "title": "trigger execution",
    "workspace": "ws_abc",
    "progress": 50,
    "startedAt": "2026-04-13T12:00:00.000Z"
  },
  "timestamp": "2026-04-13T12:00:00.000Z"
}
```

---

## Broadcast Scoping

The ConnectionManager uses `EventScope` to target messages to the right clients. Each broadcaster determines scope based on context:

### Agent Event Scoping

| Execution Type | Scope | Rationale |
|---------------|-------|-----------|
| `trigger` | Entire workspace | All workspace members see trigger activity |
| `manual`, `session`, `specialist` | Initiating user only | Personal executions are private |

### File Event Scoping

File events are scoped to `workspaceId`. Only clients subscribed to that workspace receive file change notifications.

### Workspace/Team Event Scoping

Workspace events are scoped by `workspaceId`. Team events are scoped by `teamId`.

---

## Event Bus Architecture

The event bus (`src/realtime/events/event-bus.ts`) is a type-safe singleton extending Node's `EventEmitter`. It decouples event producers (services, executors) from consumers (broadcasters, loggers).

```
┌──────────────────┐     emit()     ┌──────────┐     broadcast()     ┌─────────────────┐
│  Agent Executor   │ ───────────>  │ EventBus  │ ──────────────────> │  Broadcasters    │
│  Services         │               │           │                     │  (agent, file,   │
│  Background tasks │               │           │                     │   execution, etc) │
└──────────────────┘               └──────────┘                     └────────┬──────────┘
                                                                             │
                                                                    ConnectionManager
                                                                             │
                                                                     WebSocket clients
```

### Event Categories

| Category | Events |
|----------|--------|
| Execution | `execution:registered`, `execution:updated`, `execution:completed`, `execution:failed`, `execution:cancelled`, `execution:state-changed` |
| Agent | `agent:started`, `agent:stopped`, `agent:progress`, `agent:error`, `agent:state-changed` |
| File | `file:created`, `file:modified`, `file:deleted`, `file:watch-started`, `file:watch-stopped` |
| Workspace | `workspace:updated`, `workspace:loaded`, `workspace:unloaded` |
| Activity | `activity:new`, `activity:logged`, `activity:message-added`, `activity:file-changed`, `activity:status-changed` |
| Team | `team:updated`, `team:member-added`, `team:member-removed` |
| Approval | `approval:requested`, `approval:resolved` |

Not all EventBus events are forwarded to WebSocket clients. Internal events like `workspace:loaded` and `file:watch-started` are consumed only by server-side components.

---

## Complete Message Type Reference

| Type | Direction | Endpoint Filter |
|------|-----------|----------------|
| `connection:established` | Server -> Client | All |
| `connection:pong` | Server -> Client | All |
| `agent:status` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `agent:started` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `agent:stopped` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `agent:progress` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `agent:error` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `execution:registered` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `execution:updated` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `execution:completed` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `execution:failed` | Server -> Client | `/ws/agents`, `/ws/workspace` |
| `file:created` | Server -> Client | `/ws/files`, `/ws/workspace` |
| `file:modified` | Server -> Client | `/ws/files`, `/ws/workspace` |
| `file:deleted` | Server -> Client | `/ws/files`, `/ws/workspace` |
| `workspace:updated` | Server -> Client | `/ws/workspace` |
| `team:updated` | Server -> Client | `/ws/workspace` |
| `activity:new` | Server -> Client | `/ws/workspace` |
| `approval:requested` | Server -> Client | `/ws/workspace` |
| `approval:resolved` | Server -> Client | `/ws/workspace` |
| `ping` | Client -> Server | All |
