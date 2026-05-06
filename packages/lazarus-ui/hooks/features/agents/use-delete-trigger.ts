'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDeleteTrigger = (
  workspaceId: string,
  agentId: string,
  triggerId: string,
) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/triggers/${triggerId}`,
    params: { workspaceId },
  })
