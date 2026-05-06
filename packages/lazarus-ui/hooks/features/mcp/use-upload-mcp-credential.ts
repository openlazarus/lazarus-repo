'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUploadMcpCredential = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, FormData>({
    path: '/api/workspaces/mcp/upload-credential',
    params: { workspaceId },
  })
