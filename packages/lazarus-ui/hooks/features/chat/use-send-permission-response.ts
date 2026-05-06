'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

type TPermissionResponseBody = {
  sessionId: string
  requestId: string
  approved: boolean
  reason?: string
}

export const useSendPermissionResponse = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, TPermissionResponseBody>({
    path: '/api/chat/permission-response',
    params: { workspaceId },
  })
