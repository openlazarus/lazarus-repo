'use client'

import { useAuthDeleteWorkspaceApi } from '@/hooks/data/use-workspace-api'

export const useCancelWorkspaceInvitation = (
  workspaceId: string,
  invitationId: string,
) =>
  useAuthDeleteWorkspaceApi<void>({
    path: `/api/workspaces/invitations/${invitationId}`,
    params: { workspaceId },
  })
