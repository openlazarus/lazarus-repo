'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useRemoveWorkspaceMember = (
  workspaceId: string,
  memberId: string,
) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/workspaces/members/${memberId}`,
    params: { workspaceId },
  })
