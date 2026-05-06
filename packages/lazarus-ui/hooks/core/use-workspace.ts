import { useCallback, useEffect } from 'react'

import { useAuthGet } from '@/hooks/data/use-api-request'
import { useAuthStore } from '@/store/auth-store'
import { useWorkspaceStore, Workspace } from '@/store/workspace-store'
import { createClient } from '@/utils/supabase/client'

interface WorkspaceListResponse {
  workspaces: Workspace[]
  count: number
}

/**
 * Fetch Supabase metadata (avatar, color, needs_onboarding, member counts)
 * and merge with backend workspace data.
 */
async function enrichWithSupabaseMetadata(
  workspaces: Workspace[],
): Promise<Workspace[]> {
  if (workspaces.length === 0) return workspaces

  const supabase = createClient()
  const workspaceIds = workspaces.map((ws) => ws.id)

  let workspaceMetadata: Record<
    string,
    { avatar: string | null; color: string | null; needsOnboarding: boolean }
  > = {}
  let memberCountData: Record<string, number> = {}

  const { data: metadataRows } = await supabase
    .from('workspaces')
    .select('id, avatar, color, needs_onboarding')
    .in('id', workspaceIds)

  if (metadataRows) {
    workspaceMetadata = metadataRows.reduce(
      (acc, row) => {
        acc[row.id] = {
          avatar: row.avatar,
          color: row.color,
          needsOnboarding: row.needs_onboarding ?? false,
        }
        return acc
      },
      {} as typeof workspaceMetadata,
    )
  }

  const { data: memberRows } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .in('workspace_id', workspaceIds)

  if (memberRows) {
    memberCountData = memberRows.reduce(
      (acc, row) => {
        acc[row.workspace_id] = (acc[row.workspace_id] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )
  }

  return workspaces.map((ws) => ({
    ...ws,
    avatar: workspaceMetadata[ws.id]?.avatar ?? ws.avatar ?? null,
    color: workspaceMetadata[ws.id]?.color ?? ws.color ?? null,
    memberCount: memberCountData[ws.id] || 1,
    agentCount: ws.agentCount || 0,
    needsOnboarding: workspaceMetadata[ws.id]?.needsOnboarding ?? false,
  }))
}

/**
 * Enrich backend workspaces and sync to the Zustand store.
 * Returns the enriched list so callers can use it immediately.
 */
async function enrichAndSync(
  backendWorkspaces: Workspace[],
): Promise<Workspace[]> {
  const store = useWorkspaceStore.getState()

  let result: Workspace[]
  try {
    result = await enrichWithSupabaseMetadata(backendWorkspaces)
  } catch (err) {
    console.error('[useWorkspace] Failed to enrich workspaces:', err)
    result = backendWorkspaces
  }

  store.setWorkspaces(result)
  store.setInitialized(true)
  return result
}

/**
 * Core workspace management hook with global Zustand state
 *
 * **When to use**: This is the PRIMARY hook for workspace management
 *
 * **Architecture**:
 * - Uses Zustand auth-store for profile
 * - Uses Zustand workspace-store for global state management
 * - Fetches workspaces via SWR (useAuthGet)
 * - onSuccess enriches with Supabase metadata and syncs to store (fire-and-forget on initial load)
 * - refreshWorkspaces() awaits mutate() then enriches — store is guaranteed up-to-date when it resolves
 * - Auto-selection logic: stored activeWorkspaceId > first workspace
 */
export function useWorkspace() {
  const profile = useAuthStore((s) => s.profile)

  // Get state and actions from Zustand store
  const workspaces = useWorkspaceStore((state) => state.workspaces)
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  )
  const isLoading = useWorkspaceStore((state) => state.isLoading)
  const error = useWorkspaceStore((state) => state.error)
  const isInitialized = useWorkspaceStore((state) => state.isInitialized)
  const setActiveWorkspace = useWorkspaceStore(
    (state) => state.setActiveWorkspace,
  )
  const addWorkspace = useWorkspaceStore((state) => state.addWorkspace)
  const updateWorkspaceInStore = useWorkspaceStore(
    (state) => state.updateWorkspace,
  )
  const removeWorkspace = useWorkspaceStore((state) => state.removeWorkspace)

  // Fetch workspaces from backend via SWR (only when profile is available).
  // onSuccess handles initial load — fire-and-forget is fine here since
  // nothing awaits the initial SWR fetch.
  const { mutate, loading: swrLoading } = useAuthGet<WorkspaceListResponse>({
    path: profile?.id ? '/api/workspaces' : '',
    initialState: { workspaces: [], count: 0 },
    onSuccess: (data: WorkspaceListResponse) => {
      const ws = data?.workspaces
      if (ws && ws.length > 0) {
        enrichAndSync(ws)
      }
    },
  })

  // Compute selected workspace
  const selectedWorkspace = activeWorkspaceId
    ? workspaces.find((ws) => ws.id === activeWorkspaceId) || null
    : null

  // Auto-select first workspace if none selected after initialization
  useEffect(() => {
    if (
      isInitialized &&
      !isLoading &&
      workspaces.length > 0 &&
      !activeWorkspaceId
    ) {
      setActiveWorkspace(workspaces[0].id)
    }
  }, [
    isInitialized,
    isLoading,
    workspaces,
    activeWorkspaceId,
    setActiveWorkspace,
  ])

  const selectWorkspace = useCallback(
    (workspaceId: string | null) => {
      setActiveWorkspace(workspaceId)
    },
    [setActiveWorkspace],
  )

  // Refresh workspaces — awaits mutate() then enriches inline.
  // Store is guaranteed up-to-date when the returned promise resolves,
  // so callers can safely call setActiveWorkspace() right after.
  const refreshWorkspaces = useCallback(async () => {
    const fresh = await mutate()
    const ws = fresh?.workspaces
    if (ws && ws.length > 0) {
      await enrichAndSync(ws)
    }
  }, [mutate])

  const createWorkspace = useCallback(
    async (
      name: string,
      type: 'user' | 'team' = 'user',
      description?: string,
    ): Promise<Workspace> => {
      await refreshWorkspaces()
      const ws = useWorkspaceStore
        .getState()
        .workspaces.find((w) => w.name === name)
      if (ws) return ws
      throw new Error('Workspace creation failed')
    },
    [refreshWorkspaces],
  )

  const deleteWorkspace = useCallback(
    async (workspaceId: string) => {
      removeWorkspace(workspaceId)
    },
    [removeWorkspace],
  )

  return {
    workspaces,
    selectedWorkspace,
    isLoading: isLoading || swrLoading,
    isInitialized,
    error,
    createWorkspace,
    deleteWorkspace,
    selectWorkspace,
    refreshWorkspaces,
    addWorkspace,
    updateWorkspace: updateWorkspaceInStore,
  }
}

export type { Workspace } from '@/store/workspace-store'
