'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TResolvePayload {
  approved: boolean
}

export const useResolveApproval = (workspaceId: string, approvalId: string) =>
  useAuthPostWorkspaceApi<void, TResolvePayload>({
    path: `/api/workspaces/approvals/${approvalId}/resolve`,
    params: { workspaceId },
  })
