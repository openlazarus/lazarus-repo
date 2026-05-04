'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

import type { FileListResponse } from '@/hooks/features/workspace/types'

export const useListWorkspaceFiles = (workspaceId: string, path?: string) =>
  useAuthGetWorkspaceApi<FileListResponse>({
    path: '/api/workspaces/files',
    params: { workspaceId, ...(path !== undefined ? { path } : {}) },
    enabled: !!workspaceId,
  })
