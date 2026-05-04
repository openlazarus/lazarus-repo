'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useUnlockFile = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void>({
    path: '/api/workspaces/file/unlock',
    params: { workspaceId },
  })
