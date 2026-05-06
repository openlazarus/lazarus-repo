'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { WorkspaceAgent } from '@/store/agents-store'

export const useCreateAgent = (workspaceId: string) =>
  useAuthPostWorkspaceApi<{ agent: WorkspaceAgent }>({
    path: '/api/workspaces/agents',
    params: { workspaceId },
  })
