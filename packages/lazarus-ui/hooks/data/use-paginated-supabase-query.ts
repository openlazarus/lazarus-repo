import { PostgrestError, PostgrestFilterBuilder } from '@supabase/postgrest-js'
import { useCallback, useEffect, useState } from 'react'

import { createClient } from '@/utils/supabase/client'

import { useIsMounted } from '../utils/use-is-mounted'
import { useLogger } from '../utils/use-logger'
import { useSupabaseQuery } from './use-supabase-query'

type PaginationState = {
  page: number
  pageSize: number
  total: number
  hasMore: boolean
}

type UsePaginatedSupabaseQueryOptions<T> = {
  initialState?: T
  enabled?: boolean
  select?: (data: any) => T
  onError?: (error: PostgrestError) => void
  onSuccess?: (data: T, pagination: PaginationState) => void
  deps?: any[]
  pageSize?: number
  page?: number
  countQueryFn?: (supabase: ReturnType<typeof createClient>) => Promise<number>
  debug?: boolean
}

const extractDataAndCount = (response: any) => {
  if (response && typeof response === 'object' && 'data' in response) {
    return {
      data: Array.isArray(response.data) ? response.data : [],
      count: typeof response.count === 'number' ? response.count : null,
    }
  }
  return {
    data: Array.isArray(response) ? response : [],
    count: null,
  }
}

const calculateHasMore = (
  count: number | null,
  currentPage: number,
  pageSize: number,
  dataLength: number,
) => {
  if (count !== null && count >= 0) {
    const totalPages = Math.ceil(count / pageSize)
    return currentPage + 1 < totalPages
  }
  // Fallback: assume more data if we got exactly pageSize items
  return dataLength === pageSize
}

/**
 * Hook for paginated Supabase queries
 * @param queryFn Function that returns a Supabase query builder
 * @param options Configuration options for the hook
 * @returns Object with data, pagination state, and pagination controls
 */
export const usePaginatedSupabaseQuery = <T>(
  queryFn: (
    supabase: ReturnType<typeof createClient>,
  ) => PostgrestFilterBuilder<any, any, T>,
  options: UsePaginatedSupabaseQueryOptions<T> = {},
) => {
  const {
    initialState,
    enabled = true,
    select,
    onError,
    onSuccess,
    deps = [],
    pageSize = 10,
    page = 0,
    debug,
  } = options

  const logger = useLogger(debug)
  const [pagination, setPagination] = useState<PaginationState>({
    page,
    pageSize,
    total: 0,
    hasMore: true,
  })
  const isMounted = useIsMounted()

  const from = pagination.page * pagination.pageSize
  const to = from + pagination.pageSize - 1

  const handleSuccess = useCallback(
    (data: any) => {
      const { data: arrayData, count: totalCount } = extractDataAndCount(data)

      logger.log('Paginated Query Success:', {
        page: pagination.page,
        dataLength: arrayData.length,
        totalCount,
      })

      // Update pagination state with count if available
      if (totalCount !== null) {
        setPagination((prev) => ({ ...prev, total: totalCount }))
      }

      // Trim data to pageSize for consistency
      const trimmedData = arrayData.slice(0, pagination.pageSize)

      onSuccess?.(trimmedData as T, {
        ...pagination,
        total: totalCount ?? pagination.total,
      })
    },
    [onSuccess, pagination, logger],
  )

  const paginatedQueryFn = useCallback(
    (supabase: ReturnType<typeof createClient>) => {
      logger.log('Executing paginated query:', {
        from,
        to,
        page: pagination.page,
      })
      // Get the base query and apply range
      const baseQuery = queryFn(supabase)
      return baseQuery.range(from, to)
    },
    [queryFn, from, to, pagination.page, logger],
  )

  const result = useSupabaseQuery<T>(
    paginatedQueryFn as unknown as (
      supabase: ReturnType<typeof createClient>,
    ) => PostgrestFilterBuilder<any, any, any[]>,
    {
      initialState,
      enabled,
      select,
      onError,
      onSuccess: handleSuccess,
      deps: [...deps, pagination.page, pagination.pageSize],
      debug,
    },
  )

  // Trigger refetch when page or pageSize changes
  useEffect(() => {
    // Skip refetch on initial mount as useSupabaseQuery will fetch automatically
    if (!isMounted) {
      return
    }

    if (enabled && result.refetch) {
      logger.log('Page changed, triggering refetch:', {
        page: pagination.page,
        pageSize: pagination.pageSize,
      })
      result.refetch()
    }
  }, [pagination.page, pagination.pageSize, enabled, isMounted])

  // Calculate hasMore and update pagination state
  const computedHasMore = calculateHasMore(
    result.count,
    pagination.page,
    pagination.pageSize,
    Array.isArray(result.data) ? result.data.length : 0,
  )

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      hasMore: computedHasMore,
      total: result.count > 0 ? result.count : prev.total,
    }))
  }, [computedHasMore, result.count])

  const nextPage = useCallback(() => {
    if (pagination.hasMore) {
      setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
    }
  }, [pagination.hasMore])

  const prevPage = useCallback(() => {
    if (pagination.page > 0) {
      setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
    }
  }, [pagination.page])

  const goToPage = useCallback((page: number) => {
    const validPage = Math.max(0, page)
    setPagination((prev) => ({ ...prev, page: validPage }))
  }, [])

  const setPageSize = useCallback(
    (newPageSize: number) => {
      const firstItemIndex = pagination.page * pagination.pageSize
      const newPage = Math.floor(firstItemIndex / newPageSize)

      setPagination((prev) => ({
        ...prev,
        pageSize: newPageSize,
        page: newPage,
      }))
    },
    [pagination],
  )

  return {
    ...result,
    pagination,
    nextPage,
    prevPage,
    goToPage,
    setPageSize,
    count: pagination.total ?? 0,
  }
}
