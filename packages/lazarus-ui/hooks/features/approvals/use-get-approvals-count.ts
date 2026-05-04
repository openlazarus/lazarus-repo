'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TApprovalsCountResponse {
  count: number
}

export const useGetApprovalsCount = (workspaceId: string) =>
  useAuthGetWorkspaceApi<TApprovalsCountResponse>({
    path: '/api/workspaces/approvals/count',
    params: { workspaceId },
    enabled: !!workspaceId,
  })
