'use client'

import { useAuthPatchWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TUpdateRolePayload {
  role: string
}

export const useUpdateWorkspaceMemberRole = (
  workspaceId: string,
  memberId: string,
) =>
  useAuthPatchWorkspaceApi<void>({
    path: `/api/workspaces/members/${memberId}`,
    params: { workspaceId },
  })

export type { TUpdateRolePayload }
