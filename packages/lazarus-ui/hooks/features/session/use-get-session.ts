'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { SessionDetails } from './types'

export const useGetSession = (workspaceId: string, sessionId: string) =>
  useAuthGetWorkspaceApi<{ session: SessionDetails }>({
    path: `/api/sessions/${sessionId}`,
    params: { workspaceId },
    enabled: !!workspaceId && !!sessionId,
  })
