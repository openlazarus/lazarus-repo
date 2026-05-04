'use client'

import { useAuthPutWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUpdateTrigger = (
  workspaceId: string,
  agentId: string,
  triggerId: string,
) =>
  useAuthPutWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/triggers/${triggerId}`,
    params: { workspaceId },
  })
