'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TWriteFilePayload {
  path: string
  content: string
}

export const useWriteWorkspaceFileContent = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, TWriteFilePayload>({
    path: '/api/files/workspace/write',
    params: { workspaceId },
  })
