'use client'

import { useAuthPutWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUpdateAgentEmailRestriction = (
  workspaceId: string,
  agentId: string,
) =>
  useAuthPutWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/email-restriction`,
    params: { workspaceId },
  })
