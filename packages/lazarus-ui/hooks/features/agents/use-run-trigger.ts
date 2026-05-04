'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useRunTrigger = (
  workspaceId: string,
  agentId: string,
  triggerId: string,
) =>
  useAuthPostWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/triggers/${triggerId}/run`,
    params: { workspaceId },
  })
