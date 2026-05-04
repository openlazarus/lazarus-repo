'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type { ServerMember } from '@/model/workspace-member'

interface TWorkspaceMembersResponse {
  members: ServerMember[]
}

export const useGetWorkspaceMembers = (workspaceId: string) =>
  useAuthGetWorkspaceApi<TWorkspaceMembersResponse>({
    path: '/api/workspaces/members',
    params: { workspaceId },
    enabled: !!workspaceId,
  })
