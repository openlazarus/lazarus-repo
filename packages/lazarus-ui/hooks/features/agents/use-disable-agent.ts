'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDisableAgent = (workspaceId: string, agentId: string) =>
  useAuthPostWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/disable`,
    params: { workspaceId },
  })
