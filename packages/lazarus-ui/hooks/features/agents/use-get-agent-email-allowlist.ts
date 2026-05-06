'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useGetAgentEmailAllowlist = (
  workspaceId: string,
  agentId: string,
) =>
  useAuthGetWorkspaceApi<{ allowlist: string[]; restrictToAllowlist: boolean }>(
    {
      path: `/api/workspaces/agents/${agentId}/email-allowlist`,
      params: { workspaceId },
      enabled: !!workspaceId && !!agentId,
    },
  )
