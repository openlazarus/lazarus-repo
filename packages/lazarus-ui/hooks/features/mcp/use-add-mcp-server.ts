'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

type AddMcpServerBody = {
  preset_id: string
  env: Record<string, string>
  enabled: boolean
}

export const useAddMcpServer = (workspaceId: string, serverName: string) =>
  useAuthPostWorkspaceApi<void, AddMcpServerBody>({
    path: `/api/workspaces/mcp/servers/${encodeURIComponent(serverName)}`,
    params: { workspaceId },
  })
