'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

interface TAddMemberPayload {
  userId?: string
  email?: string
  role?: string
}

export const useAddWorkspaceMember = (workspaceId: string) =>
  useAuthPostWorkspaceApi<void, TAddMemberPayload>({
    path: '/api/workspaces/members',
    params: { workspaceId },
  })
