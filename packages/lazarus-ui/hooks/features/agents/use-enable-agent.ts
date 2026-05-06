'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useEnableAgent = (workspaceId: string, agentId: string) =>
  useAuthPostWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/enable`,
    params: { workspaceId },
  })
