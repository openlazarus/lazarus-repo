'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { WorkspaceAgent } from '@/store/agents-store'

export const useGetAgent = (workspaceId: string, agentId: string) =>
  useAuthGetWorkspaceApi<{ agent: WorkspaceAgent }>({
    path: `/api/workspaces/agents/${agentId}`,
    params: { workspaceId },
    enabled: !!workspaceId && !!agentId,
  })
