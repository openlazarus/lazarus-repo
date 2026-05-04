'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useEnableMcpServer = (workspaceId: string, serverName: string) =>
  useAuthPostWorkspaceApi<void>({
    path: `/api/workspaces/mcp/servers/${serverName}/enable`,
    params: { workspaceId },
  })
