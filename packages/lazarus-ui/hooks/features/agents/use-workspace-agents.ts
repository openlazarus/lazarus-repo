import { useCallback, useEffect } from 'react'

import { useAppEvents } from '@/hooks/core/use-app-events'
import { useAgentsStore, WorkspaceAgent } from '@/store/agents-store'

// Re-export WorkspaceAgent type for backwards compatibility
export type { WorkspaceAgent }

interface UseWorkspaceAgentsReturn {
  agents: WorkspaceAgent[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useWorkspaceAgents(
  workspaceId: string | null,
  userId: string | null,
): UseWorkspaceAgentsReturn {
  const agentsByWorkspace = useAgentsStore((state) => state.agentsByWorkspace)
  const loadingByWorkspace = useAgentsStore((state) => state.loadingByWorkspace)
  const errorByWorkspace = useAgentsStore((state) => state.errorByWorkspace)
  const fetchAgents = useAgentsStore((state) => state.fetchAgents)

  // Get agents for current workspace (filter to enabled only)
  const agents = workspaceId
    ? (agentsByWorkspace[workspaceId] || []).filter((agent) => agent.enabled)
    : []

  const loading = workspaceId
    ? (loadingByWorkspace[workspaceId] ?? true)
    : false

  const error = workspaceId ? (errorByWorkspace[workspaceId] ?? null) : null

  const refresh = useCallback(async () => {
    if (!workspaceId || !userId) {
      return
    }
    await fetchAgents(workspaceId, userId)
  }, [workspaceId, userId, fetchAgents])

  // Fetch agents on mount and when workspace/user changes
  useEffect(() => {
    if (workspaceId && userId) {
      // Only fetch if we don't have agents for this workspace yet
      // Read from store directly to avoid dependency on agentsByWorkspace object ref
      const current = useAgentsStore.getState().agentsByWorkspace[workspaceId]
      if (!current) {
        fetchAgents(workspaceId, userId)
      }
    }
  }, [workspaceId, userId, fetchAgents])

  useAppEvents({
    agentCreated: () => {
      if (workspaceId && userId) fetchAgents(workspaceId, userId)
    },
    agentDeleted: () => {
      if (workspaceId && userId) fetchAgents(workspaceId, userId)
    },
  })

  return {
    agents,
    loading,
    error,
    refresh,
  }
}
