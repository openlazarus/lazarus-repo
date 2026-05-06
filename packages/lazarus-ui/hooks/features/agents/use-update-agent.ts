'use client'

import { useAuthPutWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { WorkspaceAgent } from '@/store/agents-store'

export const useUpdateAgent = (workspaceId: string, agentId: string) =>
  useAuthPutWorkspaceApi<{ agent: WorkspaceAgent }>({
    path: `/api/workspaces/agents/${agentId}`,
    params: { workspaceId },
  })
