'use client'

import { useMemo } from 'react'

import { useAuthGetWorkspaceApi } from '@/hooks/data/use-workspace-api'
import type {
  FileListResponse,
  WorkspaceFile,
} from '@/hooks/features/workspace/types'
import { useDebounce } from '@/hooks/utils/use-debounce'

export interface UseWorkspaceFileSearchOptions {
  /** Minimum characters before triggering search (default 2) */
  minChars?: number
  /** Debounce delay in ms (default 300) */
  debounce?: number
}

export interface UseWorkspaceFileSearchResult {
  /** Search results (directories first) */
  results: WorkspaceFile[]
  /** Whether a search request is in-flight */
  loading: boolean
  /** Whether search is active (query meets minChars) */
  isSearching: boolean
}

/**
 * Hook for recursive file search across a workspace.
 * Debounces the query and calls the backend search endpoint.
 * Reusable in tag pickers, command palettes, file browsers, etc.
 */
export function useWorkspaceFileSearch(
  workspaceId: string | undefined,
  query: string,
  options: UseWorkspaceFileSearchOptions = {},
): UseWorkspaceFileSearchResult {
  const { minChars = 2, debounce: delay = 300 } = options

  const debouncedQuery = useDebounce(query, delay)
  const isSearching = debouncedQuery.length >= minChars

  // Call backend with ?query= param — triggers recursive search
  const { data, loading } = useAuthGetWorkspaceApi<FileListResponse>({
    path: '/api/workspaces/files',
    params:
      workspaceId && isSearching ? { workspaceId, query: debouncedQuery } : {},
    enabled: !!workspaceId && isSearching,
  })

  // Directories first, then files
  const results = useMemo(() => {
    const files = data?.files || []
    const dirs = files.filter((f) => f.type === 'directory')
    const rest = files.filter((f) => f.type !== 'directory')
    return [...dirs, ...rest]
  }, [data])

  return {
    results,
    loading: isSearching && loading,
    isSearching,
  }
}
