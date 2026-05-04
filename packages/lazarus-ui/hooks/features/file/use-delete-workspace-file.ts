'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDeleteWorkspaceFile = (workspaceId: string, filePath: string) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/workspaces/file/${filePath}`,
    params: { workspaceId },
  })
