'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDisableMcpServer = (workspaceId: string, serverName: string) =>
  useAuthPostWorkspaceApi<void>({
    path: `/api/workspaces/mcp/servers/${serverName}/disable`,
    params: { workspaceId },
  })
