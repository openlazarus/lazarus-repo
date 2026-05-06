import {
  PostgrestBuilder,
  PostgrestError,
  PostgrestFilterBuilder,
} from '@supabase/postgrest-js'
import { useCallback, useEffect, useRef, useState } from 'react'

import { createClient } from '@/utils/supabase/client'

type UseSupabaseQueryOptions<T> = {
  enabled?: boolean
  select?: (data: any) => T
  onError?: (error: PostgrestError) => void
  onSuccess?: (data: T) => void
  deps?: any[]
}

// Singleton supabase client
let supabaseClient: ReturnType<typeof createClient> | null = null
const getSupabaseClient = () => {
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

/**
 * Simple hook for fetching data from Supabase - no caching
 */
export const useSupabaseQuery = <T = any>(
  queryFn: (
    supabase: ReturnType<typeof createClient>,
  ) => PostgrestFilterBuilder<any, any, any[]> | PostgrestBuilder<any>,
  options: UseSupabaseQueryOptions<T> = {},
) => {
  const { enabled = true, select, onError, onSuccess, deps = [] } = options

  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<PostgrestError | null>(null)
  const [loading, setLoading] = useState(true)

  // Use refs to store the latest callbacks to avoid stale closures
  // while not including them in useCallback dependencies
  const queryFnRef = useRef(queryFn)
  const selectRef = useRef(select)
  const onErrorRef = useRef(onError)
  const onSuccessRef = useRef(onSuccess)

  // Update refs on each render
  queryFnRef.current = queryFn
  selectRef.current = select
  onErrorRef.current = onError
  onSuccessRef.current = onSuccess

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const supabase = getSupabaseClient()
      const queryBuilder = queryFnRef.current(supabase)
      const { data: rawData, error: fetchError } = await queryBuilder

      if (fetchError) {
        throw fetchError
      }

      const processedData = selectRef.current
        ? selectRef.current(rawData)
        : (rawData as T)

      setData(processedData)
      setLoading(false)

      if (onSuccessRef.current) {
        onSuccessRef.current(processedData)
      }
    } catch (err) {
      const error = err as PostgrestError
      setError(error)
      setLoading(false)

      if (onErrorRef.current) {
        onErrorRef.current(error)
      }
    }
  }, [enabled])

  const refetch = useCallback(async () => {
    await fetchData()
  }, [fetchData])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchData()
  }, [fetchData, enabled, ...deps])

  return {
    data,
    error,
    loading,
    refetch,
  }
}
