# Frontend Architecture

## Tech Stack

| Layer         | Technology                                 | Purpose                               |
| ------------- | ------------------------------------------ | ------------------------------------- |
| Framework     | Next.js 15 (App Router)                    | SSR, routing, API routes              |
| UI            | React 19, TailwindCSS, shadcn/ui           | Components and styling                |
| State         | Zustand (with persist middleware)          | Global client state                   |
| Data fetching | SWR + custom Supabase hooks                | Caching, deduplication, revalidation  |
| API client    | Axios (centralized in `lib/api-client.ts`) | Backend HTTP requests with auto-auth  |
| Auth          | Supabase Auth (OAuth + OTP)                | Session management                    |
| Database      | Supabase (PostgREST)                       | Direct DB reads/writes via client SDK |
| Real-time     | WebSocket + Supabase Realtime              | Live updates                          |

---

## Directory Structure

```
packages/lazarus-ui/
  app/                        # Next.js App Router pages and layouts
    (main)/                   # Authenticated app shell
    auth/                     # Auth pages
    workspaces/               # Workspace-scoped pages
  components/
    ui/                       # Reusable primitives (shadcn/ui, buttons, inputs)
    features/                 # Domain-specific components (agents, workspace, auth)
    workspace/                # Workspace shell and layout components
    auth/                     # Auth forms and flows
  hooks/
    core/                     # App-wide hooks (workspace, chat, sessions, tabs)
    data/                     # Data primitives (SWR wrappers, Supabase query/mutation)
    features/                 # Domain hooks organized by feature area
    sockets/                  # WebSocket connection hooks
    ui/                       # UI behavior (animation, interaction, layout)
    utils/                    # Utility hooks (debounce, currency, logger)
    billing/                  # Credit and billing hooks
    auth/                     # Auth and profile hooks
    workspace/                # Workspace file and config hooks
  lib/                        # Shared libraries (api-client, utils)
  store/                      # Zustand stores (auth, workspace, chat, tabs, etc.)
  state/                      # Legacy state files (identity, io, ui-state)
  constants/                  # App-wide constants
  types/                      # TypeScript type definitions
  model/                      # Data models (user-profile, etc.)
  services/                   # Client-side service classes
  utils/                      # Utility functions (supabase client, helpers)
```

---

## State Management

### Pattern: Zustand stores are pure state; hooks are the behavior layer

```
Store (pure state + actions)     Hook (fetch + enrich + dispatch)     Component (read + render)
-------------------------------------------------------------------------------------------------
workspace-store.ts               use-workspace.ts                     WorkspaceSidebar.tsx
  workspaces[]                     fetches from backend (SWR)           reads selectedWorkspace
  activeWorkspaceId                enriches with Supabase metadata      calls selectWorkspace()
  setWorkspaces()                  syncs to store
  setActiveWorkspace()             exposes selectWorkspace()
```

**Rules:**

- Stores contain only state and synchronous actions. No API calls in stores.
- Hooks own the fetch-enrich-dispatch cycle. They call APIs, transform data, and write to stores.
- Components read from stores (via hooks) and call hook-provided actions. They never call APIs directly.

### Zustand Stores

| Store                    | File                             | Purpose                             |
| ------------------------ | -------------------------------- | ----------------------------------- |
| `useAuthStore`           | `store/auth-store.ts`            | Session, profile, auth actions      |
| `useWorkspaceStore`      | `store/workspace-store.ts`       | Workspace list, active workspace ID |
| `useChatStore`           | `store/chat-store.ts`            | Chat messages, streaming state      |
| `useFileExplorerStore`   | `store/file-explorer-store.ts`   | File tree state                     |
| `useFileTabStore`        | `store/file-tab-store.ts`        | Open file tabs                      |
| `useTabStore`            | `store/tab-store.ts`             | Main navigation tabs                |
| `useAgentsStore`         | `store/agents-store.ts`          | Agent list and state                |
| `useTagStore`            | `store/tag-store.ts`             | Labels/tags                         |
| `usePreferencesStore`    | `store/preferences-store.ts`     | User preferences                    |
| `useUploadProgressStore` | `store/upload-progress-store.ts` | File upload tracking                |

---

## Data Fetching

Two paths depending on the data source:

| Source                                      | Read hook               | Write hook                                                      |
| ------------------------------------------- | ----------------------- | --------------------------------------------------------------- |
| Supabase (direct DB)                        | `useAuthSupabaseQuery`  | `useAuthSupabaseMutation` / `useSupabaseMutation`               |
| Backend API (`NEXT_PUBLIC_LAZARUS_API_URL`) | `useAuthGet` / `useGet` | `useAuthPost` / `useAuthPut` / `useAuthPatch` / `useAuthDelete` |

Both paths use SWR for caching and deduplication. See `docs/hooks.md` for details.

---

## API Client

**File:** `lib/api-client.ts`

Centralized Axios instance with request interceptors that automatically inject:

| Header           | Source                                           | Purpose            |
| ---------------- | ------------------------------------------------ | ------------------ |
| `Authorization`  | Supabase session (cached, refreshed near expiry) | JWT authentication |
| `x-workspace-id` | `useWorkspaceStore.activeWorkspaceId`            | Workspace scoping  |
| `x-team-id`      | `sessionStorage.currentTeamId`                   | Team scoping       |

Response interceptor handles 401 (redirect to signin), 403 (pass to UI), and 500 (log).

```typescript
import { api } from '@/lib/api-client'

// Typed convenience methods
const agents = await api.get<Agent[]>(`/api/workspaces/${workspaceId}/agents`)
await api.post('/api/workspaces/${workspaceId}/agents', { name: 'New Agent' })
```

---

## Auth Flow

1. User signs in via Supabase Auth (Google OAuth, Apple OAuth, email OTP, phone OTP).
2. `auth-store.ts` initializes on app load, subscribes to `onAuthStateChange`.
3. Session is cached in localStorage (`lazarus:session`) for fast hydration.
4. `api-client.ts` reads the access token from the session, caches it, and refreshes when within 60s of expiry.
5. On 401 response, the client signs out and redirects to `/signin`.

---

## Workspace-Centric Design

All resources (agents, files, triggers, MCP configs) are scoped to a workspace.

**Endpoint pattern:** `/api/workspaces/{workspaceId}/{resource}/{resourceId}`

**Rules:**

- Always get `workspaceId` from `useWorkspace().selectedWorkspace?.id`.
- Never use `userId` for resource endpoints.
- Handle missing `workspaceId` gracefully (set loading false, return early).
- Use `api` client for automatic auth header injection.

```typescript
const { selectedWorkspace } = useWorkspace()
const workspaceId = selectedWorkspace?.id

// All resource fetches use workspaceId
const data = await api.get(`/api/workspaces/${workspaceId}/agents`)
```

---

## Real-time

### WebSocket (backend events)

Singleton `WebSocketManager` in `hooks/sockets/use-websocket.ts` manages a single connection with multiplexed message handlers.

| Hook                    | Purpose                                       |
| ----------------------- | --------------------------------------------- |
| `useWebSocket`          | Base WebSocket connection with auto-reconnect |
| `useChatSocket`         | Chat message streaming                        |
| `useDocumentSocket`     | Document collaboration events                 |
| `useNotificationSocket` | Push notifications                            |
| `useReasoningSocket`    | Agent reasoning trace streaming               |
| `useTabSocket`          | Tab synchronization                           |
| `useCalendarSocket`     | Calendar update events                        |
| `useWorkspaceSocket`    | Workspace-level events (files + agents)       |

### Supabase Realtime (database changes)

Used for DB row-level changes (inserts, updates, deletes) via Supabase's built-in Realtime channels. Hooks subscribe to specific tables/filters and update local state on change.
