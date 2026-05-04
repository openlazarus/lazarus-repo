'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useLeaveWorkspace = (workspaceId: string) =>
  useAuthDeleteWorkspaceApi<void>({
    path: '/api/workspaces/members/me',
    params: { workspaceId },
  })
