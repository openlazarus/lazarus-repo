'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUploadWorkspaceFile = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, FormData>({
    path: '/api/workspaces/upload',
    params: { workspaceId },
  })
