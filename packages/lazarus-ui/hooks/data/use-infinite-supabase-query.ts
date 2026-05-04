import { PostgrestError, PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { createClient } from '@/utils/supabase/client'

import { useLogger } from '../utils/use-logger'
import { usePaginatedSupabaseQuery } from './use-paginated-supabase-query'

type PaginationState = {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

type UseInfiniteSupabaseQueryOptions<T> = {
  initialState?: T[]
  enabled?: boolean
  select?: (data: any) => T
  onError?: (error: PostgrestError) => void
  onSuccess?: (data: T[]) => void
  deps?: any[]
  pageSize?: number
  debug?: boolean
  countQueryFn?: (supabase: ReturnType<typeof createClient>) => Promise<number>
}

const RECENT_THRESHOLD = 10000 // 10 seconds

const mergeDataForFirstPage = <T>(
  prevData: T[],
  newPageData: T[],
  skipRecentPreservation: boolean = false,
): T[] => {
  const recentThreshold = Date.now() - RECENT_THRESHOLD
  const mergedData = [...newPageData]

  // Only preserve recently created items if query hasn't changed
  if (!skipRecentPreservation) {
    // Preserve recently created items that aren't in the server response
    prevData.forEach((item) => {
      const itemId = (item as any).id
      const itemCreatedAt = new Date((item as any).createdAt || 0).getTime()
      const isRecentlyCreated = itemCreatedAt > recentThreshold

      if (
        !newPageData.some((newItem) => (newItem as any).id === itemId) &&
        isRecentlyCreated
      ) {
        mergedData.push(item)
      }
    })
  }

  // Sort by createdAt descending
  return mergedData
}

const mergeDataForSubsequentPages = <T>(
  prevData: T[],
  newPageData: T[],
): T[] => {
  const existingItemsMap = new Map(
    prevData.map((item) => [(item as any).id, item]),
  )
  const newItems = newPageData.filter(
    (newItem) => !existingItemsMap.has((newItem as any).id),
  )
  return [...prevData, ...newItems]
}

/**
 * Hook for infinite loading with Supabase queries
 * @param queryFn Function that returns a Supabase query builder
 * @param options Configuration options for the hook
 * @returns Object with data, infinite loading state, and loading controls
 */
export const useInfiniteSupabaseQuery = <T>(
  queryFn: (
    supabase: ReturnType<typeof createClient>,
  ) => PostgrestFilterBuilder<any, any, any[]>,
  options: UseInfiniteSupabaseQueryOptions<T> = {},
) => {
  const {
    initialState = [],
    enabled = true,
    select,
    onError,
    onSuccess,
    deps = [],
    pageSize = 10,
    debug = false,
  } = options

  const logger = useLogger(debug)
  const [data, setData] = useState<T[]>(initialState)
  const [hasLoadedInitialData, setHasLoadedInitialData] = useState(false)
  const [totalCount, setTotalCount] = useState<number | null>(null)
  const [loadedPages, setLoadedPages] = useState<Set<number>>(new Set([0]))
  const [deletionsCount, setDeletionsCount] = useState(0)
  const prevDepsRef = useRef<any[]>(deps)

  // Check if deps have changed
  const depsChanged = useRef(false)
  useEffect(() => {
    const depsString = JSON.stringify(deps)
    const prevDepsString = JSON.stringify(prevDepsRef.current)
    depsChanged.current = depsString !== prevDepsString
    if (depsChanged.current) {
      prevDepsRef.current = deps
    }
  }, [deps])

  const handlePageSuccess = useCallback(
    (pageData: T[], pagination: PaginationState) => {
      const validPageData = Array.isArray(pageData) ? pageData : []

      logger.log('Infinite Query page success:', {
        page: pagination.page,
        dataLength: validPageData.length,
        total: pagination.total,
      })

      // Track loaded pages
      setLoadedPages((prev) => new Set([...Array.from(prev), pagination.page]))

      // Update total count
      if (pagination.total > 0 && pagination.total !== totalCount) {
        setTotalCount(pagination.total)
      }

      setData((prevData) => {
        const isFirstPage = pagination.page === 0
        const updatedData = isFirstPage
          ? mergeDataForFirstPage(prevData, validPageData, depsChanged.current)
          : mergeDataForSubsequentPages(prevData, validPageData)

        if (updatedData.length > 0) {
          setHasLoadedInitialData(true)
        }

        logger.log('Data updated:', {
          prevLength: prevData.length,
          newLength: updatedData.length,
          isFirstPage,
        })

        // Reset depsChanged after using it
        if (depsChanged.current) {
          depsChanged.current = false
        }

        return updatedData
      })

      onSuccess?.(validPageData)
    },
    [totalCount, logger, onSuccess],
  )

  const {
    loading: paginatedLoading,
    pagination,
    nextPage,
    goToPage,
    error,
    sources,
    mutate,
  } = usePaginatedSupabaseQuery(
    // Wrap the query function to handle deletion offset adjustments
    (supabase) => {
      // The paginated query will apply .range(from, to) automatically
      // But we need to create a wrapper that can adjust for deletions
      const baseQuery = queryFn(supabase)

      // Store the original range method
      const originalRange = baseQuery.range.bind(baseQuery)

      // Override the range method to adjust for deletions
      baseQuery.range = (from: number, to: number) => {
        const adjustedFrom = Math.max(0, from - deletionsCount)
        const adjustedTo = Math.max(0, to - deletionsCount)

        logger.log('Adjusted pagination for deletions:', {
          originalFrom: from,
          originalTo: to,
          deletionsCount,
          adjustedFrom,
          adjustedTo,
        })

        return originalRange(adjustedFrom, adjustedTo)
      }

      return baseQuery
    },
    {
      pageSize,
      enabled,
      deps: [...deps, deletionsCount], // Include deletionsCount in deps
      debug,
      select: select
        ? (rawData) => {
            const dataArray = Array.isArray(rawData) ? rawData : [rawData]
            return dataArray.map((item) => select(item))
          }
        : undefined,
      onError,
      onSuccess: (pageData) => handlePageSuccess(pageData as T[], pagination),
    },
  )

  const safeData = data ?? initialState
  const computedHasMore = pagination.hasMore

  const loadMore = useCallback(() => {
    if (computedHasMore) {
      nextPage()
    }
  }, [computedHasMore, nextPage])

  const reset = useCallback(() => {
    setData(initialState)
    setLoadedPages(new Set([0]))
    setHasLoadedInitialData(false)
    setTotalCount(null)
    setDeletionsCount(0)
    goToPage(0)
    return mutate()
  }, [mutate, initialState, goToPage])

  // Compute loading states
  const isLoading =
    paginatedLoading && pagination.page === 0 && !hasLoadedInitialData
  const isFetchingMore = paginatedLoading && pagination.page > 0
  const isRefreshing =
    paginatedLoading && pagination.page === 0 && hasLoadedInitialData

  logger.log('Infinite Query state:', {
    dataLength: safeData.length,
    hasMore: computedHasMore,
    loading: isLoading,
    fetchingMore: isFetchingMore,
  })

  return {
    data: safeData,
    loading: isLoading,
    fetchingMore: isFetchingMore,
    isRefreshing,
    isValidating: paginatedLoading,
    error,
    hasMore: computedHasMore,
    loadMore,
    sources,
    mutate,
    reset,
    count: totalCount ?? pagination.total ?? 0,
  }
}
