# Hook System & Data Patterns

This document defines how to fetch data, mutate state, and compose hooks in the Lazarus frontend. Follow these patterns for all new code.

---

## Hook Categories

### core/ -- App-wide orchestration hooks

| Hook                       | Purpose                                              |
| -------------------------- | ---------------------------------------------------- |
| `useWorkspace`             | Active workspace, workspace list, selection, CRUD    |
| `useChat`                  | Chat state, message sending, conversation management |
| `useConversation`          | Single conversation data and actions                 |
| `useConversations`         | Conversation list with pagination                    |
| `useConversationMessages`  | Messages for a conversation                          |
| `useConversationStreaming` | SSE/streaming message handling                       |
| `useSessions`              | Session management                                   |
| `useTabs`                  | Main tab navigation                                  |
| `useChatTabs`              | Chat tab management                                  |
| `useFileTabs`              | File editor tabs                                     |
| `useFileTabActions`        | File tab CRUD actions                                |
| `useFileExplorer`          | File tree navigation                                 |
| `useFileWatcher`           | File change detection                                |
| `useItems`                 | Generic item list management                         |
| `useLabels`                | Label/tag management                                 |
| `useTagger`                | Tag assignment UI logic                              |
| `useMcp`                   | MCP server connection management                     |
| `useApprovals`             | Permission approval flow                             |
| `useAppEvents`             | Cross-component event bus                            |

### data/ -- Data access primitives

| Hook                                                                           | Purpose                                                                |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| `useAuthSupabaseQuery`                                                         | SWR-cached Supabase read, gated on auth                                |
| `useAuthSupabaseMutation`                                                      | Supabase write with SWR cache invalidation, gated on auth              |
| `useSupabaseMutation`                                                          | Supabase write without auth gating                                     |
| `useInfiniteSupabaseQuery`                                                     | Infinite-scroll Supabase pagination                                    |
| `usePaginatedSupabaseQuery`                                                    | Page-based Supabase pagination                                         |
| `useGet` / `usePost` / `usePut` / `useDelete` / `usePatch`                     | SWR-cached backend API requests (unauthenticated)                      |
| `useAuthGet` / `useAuthPost` / `useAuthPut` / `useAuthDelete` / `useAuthPatch` | Backend API requests with auto-injected JWT + workspace + team headers |
| `useAuthHeaders`                                                               | Returns current auth/workspace/team headers                            |
| `useLocalStorage`                                                              | Typed localStorage read/write                                          |
| `useQueryParams`                                                               | URL query parameter management                                         |
| `useWorkspaceAPI`                                                              | Legacy workspace API calls (prefer `useWorkspace` instead)             |

### features/ -- Domain-specific hooks

| Subdirectory   | Hooks                                                                                                                                                                                                                                                                                                    |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `activity/`    | `useContributionData`                                                                                                                                                                                                                                                                                    |
| `agents/`      | `useWorkspaceAgents`, `useAgentInbox`, `useCreateTrigger`, `useExecutionControl`, `useMcpTools`, `useWhatsappConfig`, `useWhatsappStatus`                                                                                                                                                                |
| `api-keys/`    | `useApiKeys`                                                                                                                                                                                                                                                                                             |
| `document/`    | `useDocumentEdit`, `useDocumentWorkflow`                                                                                                                                                                                                                                                                 |
| `file/`        | `useCreateFile`, `useDeleteFile`, `useGetFiles`, `useUpdateFile`, `useUploadDocument`                                                                                                                                                                                                                    |
| `invitations/` | `usePendingInvitations`                                                                                                                                                                                                                                                                                  |
| `knowledge/`   | `useKnowledgeGraph`                                                                                                                                                                                                                                                                                      |
| `labels/`      | `useGetLabels`, `useCreateLabel`, `useDeleteLabel`, `useAddLabelToItem`, `useRemoveLabelFromItem`                                                                                                                                                                                                        |
| `logs/`        | `useGetLogs`, `useLogsSocket`                                                                                                                                                                                                                                                                            |
| `mcp/`         | `useMcpReconnect`, `useWorkspaceMcps`                                                                                                                                                                                                                                                                    |
| `mindmap/`     | `useMindmap`, `useMindmapWorkflow`                                                                                                                                                                                                                                                                       |
| `profile/`     | `useUploadAvatar`                                                                                                                                                                                                                                                                                        |
| `sqlite/`      | `useSqliteDatabases`, `useSqliteQuery`                                                                                                                                                                                                                                                                   |
| `v0/`          | `useV0Api`, `useV0Project`, `useV0Projects`                                                                                                                                                                                                                                                              |
| `workspace/`   | `useCreateWorkspace`, `useUpdateWorkspace`, `useTeamWorkspaces`, `useWorkspaceMembers`, `useWorkspaceFiles`, `useWorkspaceTemplates`, `useApplyTemplate`, `useInvitations`, `useDiscordSettings`, `useUploadWorkspaceAvatar`, `useValidateWorkspaceSlug`, `useWorkspacesWithTeams`, `useWorkspaceSocket` |

### sockets/ -- WebSocket hooks

| Hook                    | Purpose                                 |
| ----------------------- | --------------------------------------- |
| `useWebSocket`          | Singleton WebSocket with auto-reconnect |
| `useChatSocket`         | Chat message streaming                  |
| `useDocumentSocket`     | Document collaboration                  |
| `useNotificationSocket` | Push notifications                      |
| `useReasoningSocket`    | Agent reasoning traces                  |
| `useTabSocket`          | Tab sync                                |
| `useCalendarSocket`     | Calendar events                         |
| `useWorkspaceSocket`    | Workspace-level events                  |
| `useWebSocketStream`    | Raw WebSocket stream access             |

### ui/ -- UI behavior hooks

| Subdirectory   | Hooks                                                                                                                                                                           |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `animation/`   | `useScrollManager`, `useScrollToRef`                                                                                                                                            |
| `interaction/` | `useClickAway`, `useCopyToClipboard`, `useDismissKeyboard`, `useFocus`, `useKeyboardShortcuts`, `useMediaPicker`, `usePopover`                                                  |
| `layout/`      | `useMediaQuery`, `useScreenSize`                                                                                                                                                |
| _(root)_       | `useContainerWidth`, `useDropZone`, `useFileDragging`, `useHorizontalScroll`, `useResizableColumn`, `useResponsiveLayout`, `useTheme`, `useTwoPanelResize`, `useWindowedScroll` |

### utils/ -- Utility hooks

| Hook                | Purpose                             |
| ------------------- | ----------------------------------- |
| `useCurrency`       | Currency formatting                 |
| `useDebounce`       | Debounced values                    |
| `useFileTypeMapper` | File extension to icon/type mapping |
| `useIsMounted`      | SSR-safe mount check                |
| `useLogger`         | Debug logging with toggle           |
| `useOs`             | OS detection                        |

### billing/ -- Billing hooks

| Hook             | Purpose                             |
| ---------------- | ----------------------------------- |
| `useCredits`     | Credit balance and usage            |
| `useTeamBilling` | Team billing and subscription state |

### auth/ -- Authentication hooks

| Hook                   | Purpose                            |
| ---------------------- | ---------------------------------- |
| `useAuth`              | Auth state and sign-in/out actions |
| `useEmailVerification` | Email OTP verification flow        |
| `usePhoneVerification` | Phone OTP verification flow        |
| `useFieldVerification` | Generic field verification         |
| `useProfile`           | User profile data and updates      |

---

## Data Fetching Rules

### For Supabase (direct database) reads

ALWAYS use `useAuthSupabaseQuery`. It provides SWR caching, deduplication, auth gating, and a stable interface.

```typescript
import { useAuthSupabaseQuery } from '@/hooks/data/use-auth-supabase-query'

function useAgentTriggers(workspaceId: string, agentId: string) {
  return useAuthSupabaseQuery(workspaceId && agentId ? ['triggers', workspaceId, agentId] : null, (supabase) =>
    supabase.from('agent_triggers').select('*').eq('workspace_id', workspaceId).eq('agent_id', agentId),
  )
}
```

### For Supabase writes

ALWAYS use `useAuthSupabaseMutation`. It handles auth gating, error state, and SWR cache invalidation.

```typescript
import { useAuthSupabaseMutation } from '@/hooks/data/use-auth-supabase-mutation'

function useUpdateTrigger(workspaceId: string, agentId: string) {
  return useAuthSupabaseMutation(
    (supabase, variables: { id: string; enabled: boolean }) =>
      supabase.from('agent_triggers').update({ enabled: variables.enabled }).eq('id', variables.id).select().single(),
    {
      invalidateKeys: [['triggers', workspaceId, agentId]],
      onSuccess: () => console.log('Trigger updated'),
    },
  )
}
```

### For backend API reads

ALWAYS use `useAuthGet`. It wraps SWR with auto-injected JWT, workspace ID, and team ID headers.

```typescript
import { useAuthGet } from '@/hooks/data/use-api-request'

function useWorkspaceAgents(workspaceId: string | undefined) {
  return useAuthGet<{ agents: Agent[] }>({
    path: workspaceId ? `/api/workspaces/${workspaceId}/agents` : '',
    initialState: { agents: [] },
    enabled: !!workspaceId,
  })
}
```

### For backend API writes

Use `useAuthPost`, `useAuthPut`, `useAuthPatch`, or `useAuthDelete`. They return `[callFn, { data, loading, error }]`.

```typescript
import { useAuthPost } from '@/hooks/data/use-api-request'

function useCreateAgent(workspaceId: string) {
  const [create, { loading, error }] = useAuthPost<Agent, CreateAgentPayload>({
    path: `/api/workspaces/${workspaceId}/agents`,
    onSuccess: (agent) => console.log('Created:', agent.id),
  })
  return { create, loading, error }
}
```

---

## Workspace Hook Pattern

Every workspace-scoped hook must follow this pattern:

```typescript
import { useWorkspace } from '@/hooks/core/use-workspace'

function useMyFeature(resourceId: string) {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const { data, loading, error } = useAuthGet<MyData>({
    path: workspaceId ? `/api/workspaces/${workspaceId}/resource/${resourceId}` : '',
    enabled: !!workspaceId && !!resourceId,
  })

  return { data, loading, error }
}
```

**Key rules:**

- Get `workspaceId` from `useWorkspace().selectedWorkspace?.id`.
- Pass empty string as `path` when `workspaceId` is missing (disables the fetch).
- Never use `userId` for workspace-scoped resource endpoints.

---

## Optimistic Updates

`useAuthSupabaseMutation` supports cache invalidation via `invalidateKeys`. After a successful mutation, the specified SWR cache keys are automatically revalidated (refetched).

```typescript
const [execute] = useAuthSupabaseMutation(
  (supabase, vars: { id: string; name: string }) =>
    supabase.from('agents').update({ name: vars.name }).eq('id', vars.id).select().single(),
  {
    invalidateKeys: [['agents', workspaceId]],
    onSuccess: (data) => {
      // Optionally update Zustand store immediately for instant UI feedback
      useAgentsStore.getState().updateAgent(data.id, data)
    },
  },
)
```

For immediate UI feedback before the server responds, update the Zustand store in `onSuccess` or optimistically before calling `execute`.

---

## How to Create a New Data Hook

Step-by-step example: creating `useWorkspaceNotes`.

### 1. Create the file

```
hooks/features/notes/use-workspace-notes.ts
```

### 2. Write the hook

```typescript
import { useAuthGet } from '@/hooks/data/use-api-request'
import { useWorkspace } from '@/hooks/core/use-workspace'

interface Note {
  id: string
  title: string
  content: string
  createdAt: string
}

interface NotesResponse {
  notes: Note[]
  count: number
}

export function useWorkspaceNotes() {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id

  const { data, loading, error, mutate } = useAuthGet<NotesResponse>({
    path: workspaceId ? `/api/workspaces/${workspaceId}/notes` : '',
    initialState: { notes: [], count: 0 },
    enabled: !!workspaceId,
  })

  return {
    notes: data?.notes ?? [],
    count: data?.count ?? 0,
    loading,
    error,
    refetch: mutate,
  }
}
```

### 3. Use it in a component

```typescript
export function NotesList() {
  const { notes, loading, error } = useWorkspaceNotes()

  if (loading) return <Spinner />
  if (error) return <ErrorMessage error={error} />

  return (
    <ul>
      {notes.map((note) => (
        <li key={note.id}>{note.title}</li>
      ))}
    </ul>
  )
}
```

---

## Anti-Patterns

### 1. Direct fetch in useEffect

No caching, no deduplication, no auth headers, manual loading state.

```typescript
// BAD
function useAgents(workspaceId: string) {
  const [agents, setAgents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/workspaces/${workspaceId}/agents`)
      .then((r) => r.json())
      .then((data) => setAgents(data.agents))
      .finally(() => setLoading(false))
  }, [workspaceId])

  return { agents, loading }
}
```

**Why it is wrong:** No auth headers. No SWR caching or deduplication. Every mount triggers a new request. No error handling.

### 2. Creating Supabase client in a component

```typescript
// BAD
function AgentList() {
  const [agents, setAgents] = useState([])

  useEffect(() => {
    const supabase = createClient()  // new client per render cycle
    supabase.from('agents').select('*').then(({ data }) => setAgents(data))
  }, [])

  return <ul>{agents.map((a) => <li key={a.id}>{a.name}</li>)}</ul>
}
```

**Why it is wrong:** Creates a new Supabase client on every mount. Bypasses the singleton. No auth gating. Not cached.

### 3. Mixing API methods

```typescript
// BAD
import { apiClient } from '@/lib/api-client'

function useMixedFetch(workspaceId: string) {
  // Some calls use apiClient
  const agents = await apiClient.get(`/api/workspaces/${workspaceId}/agents`)

  // Other calls use raw fetch
  const files = await fetch(`${API_URL}/api/workspaces/${workspaceId}/files`, {
    headers: { Authorization: `Bearer ${token}` },
  })
}
```

**Why it is wrong:** `fetch` does not get auto-injected headers. Inconsistent error handling. No SWR caching.

---

## API Access: Hooks over `apiClient`

All data access should go through hooks, not through direct `apiClient` imports. The `apiClient` (`lib/api-client.ts`) is the internal transport layer — hooks use it under the hood, but components and services should never import it directly.

```typescript
// Don't import apiClient in components or services
import { apiClient } from '@/lib/api-client'
const data = await apiClient.get('/api/workspaces/...')

// Instead, create or use an existing hook
export function useWorkspaceAgents(workspaceId: string | undefined) {
  return useAuthGet<Agent[]>(workspaceId ? `/api/workspaces/${workspaceId}/agents` : null)
}

// Use the hook in the component
const { data: agents, loading } = useWorkspaceAgents(workspaceId)
```

Some older parts of the codebase still use `apiClient` directly in service files and components. These will be migrated to hooks over time. All new code must use hooks for data access.

---

## Good Patterns

### 1. SWR-cached query hook

```typescript
import { useAuthSupabaseQuery } from '@/hooks/data/use-auth-supabase-query'

export function useTeamMembers(teamId: string | undefined) {
  const { data, loading, error, refetch } = useAuthSupabaseQuery(teamId ? ['team-members', teamId] : null, (supabase) =>
    supabase.from('team_members').select('*, profiles(full_name, avatar_url)').eq('team_id', teamId!),
  )

  return { members: data ?? [], loading, error, refetch }
}
```

### 2. Mutation with cache invalidation

```typescript
import { useAuthSupabaseMutation } from '@/hooks/data/use-auth-supabase-mutation'

export function useRemoveTeamMember(teamId: string) {
  return useAuthSupabaseMutation(
    (supabase, memberId: string) => supabase.from('team_members').delete().eq('id', memberId),
    {
      invalidateKeys: [['team-members', teamId]],
    },
  )
}
```

### 3. Composing hooks

Hooks that combine other hooks for a complete feature interface.

```typescript
import { useTeamMembers } from './use-team-members'
import { useRemoveTeamMember } from './use-remove-team-member'

export function useTeamManagement(teamId: string | undefined) {
  const { members, loading, error, refetch } = useTeamMembers(teamId)
  const [removeMember, { isLoading: removing }] = useRemoveTeamMember(teamId!)

  const handleRemove = async (memberId: string) => {
    await removeMember(memberId)
    refetch()
  }

  return {
    members,
    loading,
    error,
    removing,
    removeMember: handleRemove,
  }
}
```

---

## Summary of Rules

1. **Reads from Supabase** -- use `useAuthSupabaseQuery` or `useInfiniteSupabaseQuery`.
2. **Writes to Supabase** -- use `useAuthSupabaseMutation` or `useSupabaseMutation`.
3. **Reads from backend API** -- use `useAuthGet`.
4. **Writes to backend API** -- use `useAuthPost` / `useAuthPut` / `useAuthPatch` / `useAuthDelete`.
5. **Never** call `fetch()` or `createClient()` directly in components.
6. **Never** call API endpoints directly from components -- wrap in a hook.
7. **Always** scope workspace resources by `workspaceId`, never `userId`.
8. **Always** handle missing `workspaceId` by disabling the fetch (empty path or null key).
