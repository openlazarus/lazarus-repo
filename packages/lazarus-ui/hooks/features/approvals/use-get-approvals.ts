'use client'

import type { PendingApproval } from '@/hooks/core/use-approvals'
import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TApprovalsResponse {
  approvals: PendingApproval[]
  count: number
}

export const useGetApprovals = (workspaceId: string) =>
  useAuthGetWorkspaceApi<TApprovalsResponse>({
    path: '/api/workspaces/approvals',
    params: { workspaceId },
    enabled: !!workspaceId,
  })
