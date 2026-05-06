'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

type CreateDirectoryResponse = {
  success: boolean
  message: string
  path: string
}

export const useCreateDirectory = (workspaceId: string) =>
  useAuthPostWorkspaceApi<CreateDirectoryResponse>({
    path: '/api/workspaces/directory',
    params: { workspaceId },
  })
