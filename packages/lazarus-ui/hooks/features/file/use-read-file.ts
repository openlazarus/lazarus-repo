'use client'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'

type FileContent = {
  content: string
  encoding?: 'utf-8' | 'base64'
  size?: number
}

export const useReadFile = (
  workspaceId: string,
  filePath: string,
  options?: { enabled?: boolean },
) =>
  useAuthGetWorkspaceApi<FileContent>({
    path: `/api/workspaces/file/${filePath}`,
    params: { workspaceId },
    enabled: (options?.enabled ?? true) && !!workspaceId && !!filePath,
  })
