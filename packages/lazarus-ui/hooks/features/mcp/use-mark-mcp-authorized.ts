'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { MCPOAuthState } from './types'

export const useMarkMcpAuthorized = (workspaceId: string, serverName: string) =>
  useAuthPostWorkspaceApi<{ success: boolean; oauthState: MCPOAuthState }>({
    path: `/api/workspaces/mcp/servers/${serverName}/mark-authorized`,
    params: { workspaceId },
  })
