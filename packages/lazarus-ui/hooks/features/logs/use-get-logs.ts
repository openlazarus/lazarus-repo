import { useCallback, useEffect, useRef } from 'react'

import { useAuth } from '@/hooks/auth/use-auth'
import { LogFilter } from '@/model/log'
import { useActivityLogs } from '@/store/activity-log-store'

interface UseGetLogsOptions extends LogFilter {
  pageSize?: number
  enabled?: boolean
}

/**
 * Hook for fetching paginated logs with filtering
 * Uses Zustand store for stable state management that persists across re-renders.
 *
 * @param userIdOrWorkspaceId - The user ID or workspace ID to fetch logs for
 * @param options - Filter and pagination options
 * @returns Logs data with loading states and pagination controls
 *
 * @example
 * ```tsx
 * const { logs, loading, error, loadMore, hasMore } = useGetLogs(workspaceId, {
 *   actors: ['user-1', 'agent-finance'],
 *   types: ['agent', 'user'],
 *   dateRange: { start: new Date('2024-01-01'), end: new Date() },
 *   pageSize: 20
 * })
 * ```
 */
export const useGetLogs = (
  userIdOrWorkspaceId: string,
  options?: UseGetLogsOptions,
) => {
  const {
    search,
    actors,
    actorTypes,
    types,
    memoryCells,
    apps,
    workspaces,
    dateRange,
    tags,
    experimentStatus,
    pageSize = 20,
    enabled = true,
  } = options || {}

  const { session } = useAuth()
  const userId = session?.user?.id

  // Use the first workspace from the filter, or the provided ID as workspace ID
  const workspaceId =
    workspaces && workspaces.length > 0
      ? workspaces[0]
      : userIdOrWorkspaceId || 'default-workspace-mg664m3s'

  // Use the store hook for state
  const {
    logs,
    loading,
    loadingMore,
    error,
    hasMore,
    total,
    fetchLogs,
    loadMoreLogs,
    refreshLogs,
    setFilters,
  } = useActivityLogs(workspaceId)

  // Track if initial fetch has been done
  const initialFetchDone = useRef(false)

  // Build filter object for comparison
  const currentFilter: LogFilter = {
    search,
    actors,
    actorTypes,
    types,
    memoryCells,
    apps,
    workspaces,
    dateRange,
    tags,
    experimentStatus,
  }

  // Track previous filter for comparison
  const prevFilterRef = useRef<string>('')
  const currentFilterStr = JSON.stringify(currentFilter)

  // Fetch logs on mount and when filters change
  useEffect(() => {
    if (!enabled || !userId || !workspaceId) {
      return
    }

    const filtersChanged = prevFilterRef.current !== currentFilterStr
    prevFilterRef.current = currentFilterStr

    // Only fetch if:
    // 1. Initial fetch hasn't been done, OR
    // 2. Filters have changed
    if (!initialFetchDone.current || filtersChanged) {
      console.log('[useGetLogs] Triggering fetch:', {
        workspaceId,
        initialFetch: !initialFetchDone.current,
        filtersChanged,
      })

      fetchLogs(workspaceId, userId, {
        filter: currentFilter,
        pageSize,
        reset: filtersChanged,
      })

      initialFetchDone.current = true
    }
  }, [enabled, userId, workspaceId, currentFilterStr, pageSize, fetchLogs])

  // Reset initial fetch flag when workspace changes
  useEffect(() => {
    initialFetchDone.current = false
  }, [workspaceId])

  // Load more handler
  const loadMore = useCallback(() => {
    if (!userId || !workspaceId || !hasMore || loadingMore) {
      return
    }
    loadMoreLogs(workspaceId, userId)
  }, [userId, workspaceId, hasMore, loadingMore, loadMoreLogs])

  // Mutate/refresh handler
  const mutate = useCallback(async () => {
    if (!userId || !workspaceId) {
      return
    }
    await refreshLogs(workspaceId, userId)
  }, [userId, workspaceId, refreshLogs])

  return {
    logs,
    loading,
    error,
    mutate,
    loadMore,
    hasMore,
    fetchingMore: loadingMore,
    totalCount: total,
  }
}
