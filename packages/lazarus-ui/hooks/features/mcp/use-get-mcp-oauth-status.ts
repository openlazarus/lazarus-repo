'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { OAuthStatusResult } from './types'

export const useGetMcpOAuthStatus = (workspaceId: string, serverName: string) =>
  useAuthGetWorkspaceApi<OAuthStatusResult>({
    path: `/api/workspaces/mcp/servers/${serverName}/oauth-status`,
    params: { workspaceId },
    enabled: !!workspaceId && !!serverName,
  })
