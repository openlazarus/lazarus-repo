'use client'

import { useAuthPutWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useWriteFile = (workspaceId: string, filePath: string) =>
  useAuthPutWorkspaceApi<void>({
    path: `/api/workspaces/file/${filePath}`,
    params: { workspaceId },
  })
