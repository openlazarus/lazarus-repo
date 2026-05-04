'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type { WorkspaceConfig } from '@/hooks/features/workspace/types'

export function useWorkspaceConfig(workspaceId: string) {
  const { data, loading, error, mutate } = useAuthGetWorkspaceApi<{
    config: WorkspaceConfig
  }>({
    path: '/api/workspaces/config',
    params: { workspaceId },
    enabled: !!workspaceId,
  })

  return {
    config: data?.config ?? null,
    loading,
    error:
      error instanceof Error ? error.message : error ? String(error) : null,
    refetch: mutate,
  }
}
