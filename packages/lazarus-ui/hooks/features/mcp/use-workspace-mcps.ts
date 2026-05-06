'use client'

import { useMemo } from 'react'

import { useAppEvents } from '@/hooks/core/use-app-events'
import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

export interface WorkspaceMCP {
  name: string
  preset_id?: string
  enabled?: boolean
}

interface MCPSourcesResponse {
  availableServers?: WorkspaceMCP[]
}

export function useWorkspaceMCPs(workspaceId: string | undefined) {
  const { data, loading, mutate } = useAuthGetWorkspaceApi<MCPSourcesResponse>({
    path: '/api/workspaces/mcp/sources',
    params: workspaceId ? { workspaceId } : {},
    initialState: { availableServers: [] },
    enabled: !!workspaceId,
  })

  useAppEvents({
    sourceToggled: () => mutate(),
    sourceCreated: () => mutate(),
    sourceDeleted: () => mutate(),
  })

  const allMCPs = useMemo(
    () =>
      data.availableServers?.map((s) => ({
        name: s.name,
        preset_id: s.preset_id,
        enabled: s.enabled,
      })) || [],
    [data.availableServers],
  )

  const enabledMCPs = useMemo(
    () => allMCPs.filter((m) => m.enabled !== false),
    [allMCPs],
  )

  return { allMCPs, enabledMCPs, loading, mutate }
}
