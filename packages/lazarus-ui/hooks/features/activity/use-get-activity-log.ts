'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { GetActivityLogResponse } from './types'

export const useGetActivityLog = (
  workspaceId: string,
  logId: string,
  params?: Record<string, string>,
) =>
  useAuthGetWorkspaceApi<GetActivityLogResponse>({
    path: `/api/workspaces/activity/${logId}`,
    params: { ...params, workspaceId },
    enabled: !!workspaceId && !!logId,
  })
