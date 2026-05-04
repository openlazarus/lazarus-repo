'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

type Trigger = {
  id: string
  name: string
  type: string
  agentId: string
  workspaceId: string
  enabled: boolean
  config?: any
  createdAt?: string
  updatedAt?: string
}

export const useGetTriggers = (workspaceId: string, agentId: string) =>
  useAuthGetWorkspaceApi<{ triggers: Trigger[] }>({
    path: `/api/workspaces/agents/${agentId}/triggers`,
    params: { workspaceId },
    enabled: !!workspaceId && !!agentId,
  })
