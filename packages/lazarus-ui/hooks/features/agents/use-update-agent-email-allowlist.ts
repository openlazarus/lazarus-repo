'use client'

import { useAuthPutWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUpdateAgentEmailAllowlist = (
  workspaceId: string,
  agentId: string,
) =>
  useAuthPutWorkspaceApi<void>({
    path: `/api/workspaces/agents/${agentId}/email-allowlist`,
    params: { workspaceId },
  })
