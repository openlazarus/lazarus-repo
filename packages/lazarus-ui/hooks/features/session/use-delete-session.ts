'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useDeleteSession = (workspaceId: string, sessionId: string) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/sessions/${sessionId}`,
    params: { workspaceId },
  })
