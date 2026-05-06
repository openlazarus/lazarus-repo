'use client'

import { useAuthPostWorkspaceApi } from '@/hooks/data/use-workspace-api'

type MoveFileBody = { source_path: string; destination_path: string }
type MoveFileResponse = { success: boolean; message: string }

export const useMoveFile = (workspaceId: string) =>
  useAuthPostWorkspaceApi<MoveFileResponse, MoveFileBody>({
    path: '/api/workspaces/move',
    params: { workspaceId },
  })
