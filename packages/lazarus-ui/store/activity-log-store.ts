import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

import { Log, LogFilter } from '@/model/log'
import { activityService } from '@/services/activity.service'

/**
 * Activity Log Store State
 *
 * Production-grade Zustand store for managing activity logs.
 * Solves the issue of logs disappearing due to React state resets
 * by centralizing state in a global store with proper caching.
 */

interface ActivityLogState {
  // Core data - keyed by workspaceId for multi-workspace support
  logsByWorkspace: Record<string, Log[]>

  // Pagination state per workspace
  paginationByWorkspace: Record<
    string,
    {
      currentPage: number
      hasMore: boolean
      total: number
      pageSize: number
    }
  >

  // Loading states
  loadingByWorkspace: Record<string, boolean>
  loadingMoreByWorkspace: Record<string, boolean>

  // Error states
  errorByWorkspace: Record<string, Error | null>

  // Last fetch timestamp for cache invalidation
  lastFetchByWorkspace: Record<string, number>

  // Active filters per workspace
  filtersByWorkspace: Record<string, LogFilter>
}

interface ActivityLogActions {
  // Fetch logs for a workspace
  fetchLogs: (
    workspaceId: string,
    userId: string,
    options?: {
      filter?: LogFilter
      pageSize?: number
      reset?: boolean
    },
  ) => Promise<void>

  // Load more logs (pagination)
  loadMoreLogs: (workspaceId: string, userId: string) => Promise<void>

  // Refresh logs (re-fetch current page)
  refreshLogs: (workspaceId: string, userId: string) => Promise<void>

  // Add a new log (from WebSocket)
  addLog: (workspaceId: string, log: Log) => void

  // Update an existing log (from WebSocket)
  updateLog: (workspaceId: string, logId: string, updates: Partial<Log>) => void

  // Remove a log
  removeLog: (workspaceId: string, logId: string) => void

  // Set filters for a workspace
  setFilters: (workspaceId: string, filters: LogFilter) => void

  // Clear all logs for a workspace
  clearWorkspaceLogs: (workspaceId: string) => void

  // Reset entire store
  reset: () => void

  // Selectors
  getLogs: (workspaceId: string) => Log[]
  isLoading: (workspaceId: string) => boolean
  isLoadingMore: (workspaceId: string) => boolean
  getError: (workspaceId: string) => Error | null
  hasMore: (workspaceId: string) => boolean
  getFilters: (workspaceId: string) => LogFilter
  getTotalCount: (workspaceId: string) => number
}

type ActivityLogStore = ActivityLogState & ActivityLogActions

const DEFAULT_PAGE_SIZE = 20
const CACHE_TTL_MS = 30000 // 30 seconds cache TTL

const initialState: ActivityLogState = {
  logsByWorkspace: {},
  paginationByWorkspace: {},
  loadingByWorkspace: {},
  loadingMoreByWorkspace: {},
  errorByWorkspace: {},
  lastFetchByWorkspace: {},
  filtersByWorkspace: {},
}

export const useActivityLogStore = create<ActivityLogStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    fetchLogs: async (workspaceId, userId, options = {}) => {
      const { filter, pageSize = DEFAULT_PAGE_SIZE, reset = false } = options

      // Check if we have cached data that's still fresh
      const lastFetch = get().lastFetchByWorkspace[workspaceId] || 0
      const currentFilters = get().filtersByWorkspace[workspaceId]
      const filtersChanged =
        JSON.stringify(filter) !== JSON.stringify(currentFilters)

      // Skip fetch if data is fresh and filters haven't changed
      if (!reset && !filtersChanged) {
        const timeSinceLastFetch = Date.now() - lastFetch
        if (
          timeSinceLastFetch < CACHE_TTL_MS &&
          get().logsByWorkspace[workspaceId]?.length > 0
        ) {
          console.log(
            '[ActivityLogStore] Using cached data for workspace:',
            workspaceId,
          )
          return
        }
      }

      // Set loading state
      set((state) => ({
        loadingByWorkspace: {
          ...state.loadingByWorkspace,
          [workspaceId]: true,
        },
        errorByWorkspace: {
          ...state.errorByWorkspace,
          [workspaceId]: null,
        },
        ...(filtersChanged || reset
          ? {
              filtersByWorkspace: {
                ...state.filtersByWorkspace,
                [workspaceId]: filter || {},
              },
              paginationByWorkspace: {
                ...state.paginationByWorkspace,
                [workspaceId]: {
                  currentPage: 0,
                  hasMore: false,
                  total: 0,
                  pageSize,
                },
              },
            }
          : {}),
      }))

      try {
        console.log(
          '[ActivityLogStore] Fetching logs for workspace:',
          workspaceId,
        )

        const result = await activityService.listActivityLogs({
          workspaceId,
          userId,
          limit: pageSize,
          offset: 0,
          filter: {
            search: filter?.search,
            actors: filter?.actors,
            actorTypes: filter?.actorTypes,
            types: filter?.types,
          },
        })

        console.log('[ActivityLogStore] Fetched logs:', {
          count: result.logs.length,
          total: result.total,
          hasMore: result.hasMore,
        })

        set((state) => ({
          logsByWorkspace: {
            ...state.logsByWorkspace,
            [workspaceId]: result.logs as unknown as Log[],
          },
          paginationByWorkspace: {
            ...state.paginationByWorkspace,
            [workspaceId]: {
              currentPage: 0,
              hasMore: result.hasMore,
              total: result.total,
              pageSize,
            },
          },
          loadingByWorkspace: {
            ...state.loadingByWorkspace,
            [workspaceId]: false,
          },
          lastFetchByWorkspace: {
            ...state.lastFetchByWorkspace,
            [workspaceId]: Date.now(),
          },
        }))
      } catch (error) {
        console.error('[ActivityLogStore] Error fetching logs:', error)
        set((state) => ({
          errorByWorkspace: {
            ...state.errorByWorkspace,
            [workspaceId]:
              error instanceof Error
                ? error
                : new Error('Failed to fetch logs'),
          },
          loadingByWorkspace: {
            ...state.loadingByWorkspace,
            [workspaceId]: false,
          },
        }))
      }
    },

    loadMoreLogs: async (workspaceId, userId) => {
      const pagination = get().paginationByWorkspace[workspaceId]
      const filters = get().filtersByWorkspace[workspaceId]

      if (!pagination || !pagination.hasMore) {
        console.log('[ActivityLogStore] No more logs to load')
        return
      }

      // Prevent duplicate requests
      if (get().loadingMoreByWorkspace[workspaceId]) {
        console.log('[ActivityLogStore] Already loading more, skipping')
        return
      }

      set((state) => ({
        loadingMoreByWorkspace: {
          ...state.loadingMoreByWorkspace,
          [workspaceId]: true,
        },
      }))

      try {
        const nextPage = pagination.currentPage + 1
        const offset = nextPage * pagination.pageSize

        console.log('[ActivityLogStore] Loading more logs:', {
          workspaceId,
          page: nextPage,
          offset,
        })

        const result = await activityService.listActivityLogs({
          workspaceId,
          userId,
          limit: pagination.pageSize,
          offset,
          filter: {
            search: filters?.search,
            actors: filters?.actors,
            actorTypes: filters?.actorTypes,
            types: filters?.types,
          },
        })

        set((state) => {
          const existingLogs = state.logsByWorkspace[workspaceId] || []
          const newLogs = result.logs as unknown as Log[]

          // Deduplicate logs by ID
          const existingIds = new Set(existingLogs.map((l) => l.id))
          const uniqueNewLogs = newLogs.filter((l) => !existingIds.has(l.id))

          return {
            logsByWorkspace: {
              ...state.logsByWorkspace,
              [workspaceId]: [...existingLogs, ...uniqueNewLogs],
            },
            paginationByWorkspace: {
              ...state.paginationByWorkspace,
              [workspaceId]: {
                ...pagination,
                currentPage: nextPage,
                hasMore: result.hasMore,
                total: result.total,
              },
            },
            loadingMoreByWorkspace: {
              ...state.loadingMoreByWorkspace,
              [workspaceId]: false,
            },
          }
        })
      } catch (error) {
        console.error('[ActivityLogStore] Error loading more logs:', error)
        set((state) => ({
          loadingMoreByWorkspace: {
            ...state.loadingMoreByWorkspace,
            [workspaceId]: false,
          },
        }))
      }
    },

    refreshLogs: async (workspaceId, userId) => {
      const filters = get().filtersByWorkspace[workspaceId]
      const pagination = get().paginationByWorkspace[workspaceId]

      console.log(
        '[ActivityLogStore] Refreshing logs for workspace:',
        workspaceId,
      )

      // Force a fresh fetch by resetting the cache timestamp
      set((state) => ({
        lastFetchByWorkspace: {
          ...state.lastFetchByWorkspace,
          [workspaceId]: 0,
        },
      }))

      await get().fetchLogs(workspaceId, userId, {
        filter: filters,
        pageSize: pagination?.pageSize || DEFAULT_PAGE_SIZE,
        reset: true,
      })
    },

    addLog: (workspaceId, log) => {
      console.log('[ActivityLogStore] Adding new log:', log.id)
      set((state) => {
        const existingLogs = state.logsByWorkspace[workspaceId] || []

        // Check if log already exists
        if (existingLogs.some((l) => l.id === log.id)) {
          console.log('[ActivityLogStore] Log already exists, skipping add')
          return state
        }

        const currentPagination = state.paginationByWorkspace[workspaceId]

        return {
          logsByWorkspace: {
            ...state.logsByWorkspace,
            [workspaceId]: [log, ...existingLogs],
          },
          paginationByWorkspace: currentPagination
            ? {
                ...state.paginationByWorkspace,
                [workspaceId]: {
                  ...currentPagination,
                  total: currentPagination.total + 1,
                },
              }
            : state.paginationByWorkspace,
        }
      })
    },

    updateLog: (workspaceId, logId, updates) => {
      console.log('[ActivityLogStore] Updating log:', logId)
      set((state) => {
        const logs = state.logsByWorkspace[workspaceId]
        if (!logs) return state

        const index = logs.findIndex((l) => l.id === logId)
        if (index === -1) return state

        const updatedLogs = [...logs]
        updatedLogs[index] = { ...logs[index], ...updates }

        return {
          logsByWorkspace: {
            ...state.logsByWorkspace,
            [workspaceId]: updatedLogs,
          },
        }
      })
    },

    removeLog: (workspaceId, logId) => {
      console.log('[ActivityLogStore] Removing log:', logId)
      set((state) => {
        const logs = state.logsByWorkspace[workspaceId]
        if (!logs) return state

        const currentPagination = state.paginationByWorkspace[workspaceId]

        return {
          logsByWorkspace: {
            ...state.logsByWorkspace,
            [workspaceId]: logs.filter((l) => l.id !== logId),
          },
          paginationByWorkspace: currentPagination
            ? {
                ...state.paginationByWorkspace,
                [workspaceId]: {
                  ...currentPagination,
                  total: Math.max(0, currentPagination.total - 1),
                },
              }
            : state.paginationByWorkspace,
        }
      })
    },

    setFilters: (workspaceId, filters) => {
      console.log('[ActivityLogStore] Setting filters:', filters)
      set((state) => ({
        filtersByWorkspace: {
          ...state.filtersByWorkspace,
          [workspaceId]: filters,
        },
        paginationByWorkspace: {
          ...state.paginationByWorkspace,
          [workspaceId]: {
            currentPage: 0,
            hasMore: false,
            total: 0,
            pageSize:
              state.paginationByWorkspace[workspaceId]?.pageSize ||
              DEFAULT_PAGE_SIZE,
          },
        },
        lastFetchByWorkspace: {
          ...state.lastFetchByWorkspace,
          [workspaceId]: 0,
        },
      }))
    },

    clearWorkspaceLogs: (workspaceId) => {
      console.log(
        '[ActivityLogStore] Clearing logs for workspace:',
        workspaceId,
      )
      set((state) => {
        const { [workspaceId]: _logs, ...restLogs } = state.logsByWorkspace
        const { [workspaceId]: _pagination, ...restPagination } =
          state.paginationByWorkspace
        const { [workspaceId]: _loading, ...restLoading } =
          state.loadingByWorkspace
        const { [workspaceId]: _loadingMore, ...restLoadingMore } =
          state.loadingMoreByWorkspace
        const { [workspaceId]: _error, ...restError } = state.errorByWorkspace
        const { [workspaceId]: _lastFetch, ...restLastFetch } =
          state.lastFetchByWorkspace
        const { [workspaceId]: _filters, ...restFilters } =
          state.filtersByWorkspace

        return {
          logsByWorkspace: restLogs,
          paginationByWorkspace: restPagination,
          loadingByWorkspace: restLoading,
          loadingMoreByWorkspace: restLoadingMore,
          errorByWorkspace: restError,
          lastFetchByWorkspace: restLastFetch,
          filtersByWorkspace: restFilters,
        }
      })
    },

    reset: () => {
      console.log('[ActivityLogStore] Resetting store')
      set(initialState)
    },

    // Selectors - these read from state without triggering re-renders unless the specific slice changes
    getLogs: (workspaceId) => get().logsByWorkspace[workspaceId] || [],

    isLoading: (workspaceId) => get().loadingByWorkspace[workspaceId] || false,

    isLoadingMore: (workspaceId) =>
      get().loadingMoreByWorkspace[workspaceId] || false,

    getError: (workspaceId) => get().errorByWorkspace[workspaceId] || null,

    hasMore: (workspaceId) =>
      get().paginationByWorkspace[workspaceId]?.hasMore || false,

    getFilters: (workspaceId) => get().filtersByWorkspace[workspaceId] || {},

    getTotalCount: (workspaceId) =>
      get().paginationByWorkspace[workspaceId]?.total || 0,
  })),
)

// Stable empty array reference to prevent infinite loops in selectors
const EMPTY_LOGS: Log[] = []
const EMPTY_FILTERS: LogFilter = {}

/**
 * Custom hook for accessing activity logs with automatic subscription
 * to prevent unnecessary re-renders.
 *
 * Uses stable references for empty default values to avoid React's
 * "getSnapshot should be cached" infinite loop error.
 */
export const useActivityLogs = (workspaceId: string) => {
  const logs = useActivityLogStore(
    (state) => state.logsByWorkspace[workspaceId] ?? EMPTY_LOGS,
  )
  const loading = useActivityLogStore(
    (state) => state.loadingByWorkspace[workspaceId] ?? false,
  )
  const loadingMore = useActivityLogStore(
    (state) => state.loadingMoreByWorkspace[workspaceId] ?? false,
  )
  const error = useActivityLogStore(
    (state) => state.errorByWorkspace[workspaceId] ?? null,
  )
  const hasMore = useActivityLogStore(
    (state) => state.paginationByWorkspace[workspaceId]?.hasMore ?? false,
  )
  const total = useActivityLogStore(
    (state) => state.paginationByWorkspace[workspaceId]?.total ?? 0,
  )

  const fetchLogs = useActivityLogStore((state) => state.fetchLogs)
  const loadMoreLogs = useActivityLogStore((state) => state.loadMoreLogs)
  const refreshLogs = useActivityLogStore((state) => state.refreshLogs)
  const setFilters = useActivityLogStore((state) => state.setFilters)

  return {
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
  }
}
