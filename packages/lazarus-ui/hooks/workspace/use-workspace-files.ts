'use client'

import { useMemo } from 'react'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type {
  FileListResponse,
  WorkspaceFile,
} from '@/hooks/features/workspace/types'

export interface UseWorkspaceFilesOptions {
  /** Directory path to list (empty string = root) */
  path?: string
}

export interface UseWorkspaceFilesResult {
  /** Files in the current directory */
  files: WorkspaceFile[]
  /** Directories first, then files */
  sorted: WorkspaceFile[]
  /** Whether the request is loading */
  loading: boolean
  /** Refetch the file list */
  refetch: () => void
}

/**
 * Hook to list files in a workspace directory.
 * Returns raw WorkspaceFile objects from the backend.
 * Reusable across file browsers, tag pickers, etc.
 */
export function useWorkspaceFiles(
  workspaceId: string | undefined,
  options: UseWorkspaceFilesOptions = {},
): UseWorkspaceFilesResult {
  const { path: dirPath = '' } = options

  const { data, loading, mutate } = useAuthGetWorkspaceApi<FileListResponse>({
    path: '/api/workspaces/files',
    params: workspaceId
      ? { workspaceId, ...(dirPath ? { path: dirPath } : {}) }
      : {},
    enabled: !!workspaceId,
  })

  const files = data?.files || []

  // Directories first, then files
  const sorted = useMemo(() => {
    const dirs = files.filter((f) => f.type === 'directory')
    const rest = files.filter((f) => f.type !== 'directory')
    return [...dirs, ...rest]
  }, [files])

  return {
    files,
    sorted,
    loading,
    refetch: mutate,
  }
}
