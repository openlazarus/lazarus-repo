'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TTransferWorkspacePayload {
  newOwnerId: string
}

export const useTransferWorkspace = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, TTransferWorkspacePayload>({
    path: '/api/workspaces/transfer',
    params: { workspaceId },
  })
