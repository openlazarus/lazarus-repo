'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { WorkspaceAgent } from '@/store/agents-store'

type AgentsResponse = { agents: WorkspaceAgent[] }

export const useGetWorkspaceAgents = (
  workspaceId: string,
  params?: Record<string, string>,
) =>
  useAuthGetWorkspaceApi<AgentsResponse>({
    path: '/api/workspaces/agents',
    params: { workspaceId, ...params },
    enabled: !!workspaceId,
  })
