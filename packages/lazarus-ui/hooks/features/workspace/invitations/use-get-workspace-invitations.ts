'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type { WorkspaceInvitation } from '@/model/workspace'

interface TWorkspaceInvitationsResponse {
  invitations: WorkspaceInvitation[]
}

export const useGetWorkspaceInvitations = (workspaceId: string) =>
  useAuthGetWorkspaceApi<TWorkspaceInvitationsResponse>({
    path: '/api/workspaces/invitations',
    params: { workspaceId },
    enabled: !!workspaceId,
  })
