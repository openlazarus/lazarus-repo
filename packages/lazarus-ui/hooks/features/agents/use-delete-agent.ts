'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDeleteAgent = (workspaceId: string, agentId: string) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}`,
    params: { workspaceId },
  })
