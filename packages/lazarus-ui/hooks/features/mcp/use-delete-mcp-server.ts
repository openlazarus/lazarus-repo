'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDeleteMcpServer = (workspaceId: string, serverName: string) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/workspaces/mcp/servers/${encodeURIComponent(serverName)}`,
    params: { workspaceId },
  })
