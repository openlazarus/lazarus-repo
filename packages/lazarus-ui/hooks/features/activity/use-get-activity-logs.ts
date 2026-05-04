'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { ListActivityLogsResponse } from './types'

type Params = {
  userId?: string
  limit?: number
  offset?: number
  search?: string
  actors?: string
  actorTypes?: string
  types?: string
}

export const useGetActivityLogs = (workspaceId: string, params?: Params) =>
  useAuthGetWorkspaceApi<ListActivityLogsResponse>({
    path: '/api/workspaces/activity',
    params: { ...params, workspaceId },
    enabled: !!workspaceId,
  })
