'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useLockFile = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void>({
    path: '/api/workspaces/file/lock',
    params: { workspaceId },
  })
