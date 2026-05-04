'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { MCPSourcesResponse } from './types'

export const useGetMcpSources = (workspaceId: string) =>
  useAuthGetWorkspaceApi<MCPSourcesResponse>({
    path: '/api/workspaces/mcp/sources',
    params: { workspaceId },
    enabled: !!workspaceId,
  })
