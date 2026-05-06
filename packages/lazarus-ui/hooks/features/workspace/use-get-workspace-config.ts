'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { WorkspaceConfig } from './types'

export const useGetWorkspaceConfig = (workspaceId: string) =>
  useAuthGetWorkspaceApi<{ config: WorkspaceConfig }>({
    path: '/api/workspaces/config',
    params: { workspaceId },
    enabled: !!workspaceId,
  })
