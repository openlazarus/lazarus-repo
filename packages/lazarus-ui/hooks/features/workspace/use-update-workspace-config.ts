'use client'

import { useAuthPutWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { WorkspaceConfig } from './types'

export const useUpdateWorkspaceConfig = (workspaceId: string) =>
  useAuthPutWorkspaceApi<WorkspaceConfig>({
    path: '/api/workspaces/config',
    params: { workspaceId },
  })
