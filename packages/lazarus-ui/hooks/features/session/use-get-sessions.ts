'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { SessionListResponse } from './types'

export const useGetSessions = (workspaceId: string) =>
  useAuthGetWorkspaceApi<SessionListResponse>({
    path: '/api/sessions',
    params: { workspaceId },
    enabled: !!workspaceId,
  })
