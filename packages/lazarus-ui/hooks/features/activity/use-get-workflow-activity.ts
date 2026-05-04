'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { ActivityLog } from './types'

export const useGetWorkflowActivity = (
  workspaceId: string,
  workflowId: string,
  params?: Record<string, string>,
) =>
  useAuthGetWorkspaceApi<{ logs: ActivityLog[] }>({
    path: `/api/workspaces/activity/workflow/${workflowId}`,
    params: { ...params, workspaceId },
    enabled: !!workspaceId && !!workflowId,
  })
