'use client'

import { useAuthPatchWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUpdateMcpServerEnv = (
  workspaceId: string,
  serverName: string,
) =>
  useAuthPatchWorkspaceApi<void>({
    path: `/api/workspaces/mcp/servers/${serverName}/env`,
    params: { workspaceId },
  })
