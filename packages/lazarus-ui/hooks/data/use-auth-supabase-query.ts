/**
 * Auth-aware Supabase query hook with SWR caching and deduplication.
 *
 * Consumers depend only on the stable interface below — the SWR implementation
 * is hidden and can be swapped for TanStack Query or manual caching later.
 */

import useSWR, { mutate as globalMutate } from 'swr'

import { UserProfile } from '@/model/user-profile'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/utils/supabase/client'

// Singleton client
let supabaseClient: ReturnType<typeof createClient> | null = null
const getSupabase = () => {
  if (!supabaseClient) supabaseClient = createClient()
  return supabaseClient
}

// === INTERFACE (stable contract) ===

interface UseAuthQueryOptions<T> {
  /** Skip fetch when false (default: true) */
  enabled?: boolean
  /** Transform raw Supabase data before returning */
  select?: (data: any) => T
  /** Polling interval in ms (0 = disabled) */
  refreshInterval?: number
}

interface UseAuthQueryResult<T> {
  data: T | null
  error: Error | null
  loading: boolean
  /** Force a refetch */
  refetch: () => void
}

// === IMPLEMENTATION (SWR-backed, hidden from consumers) ===

type QueryFn = (
  supabase: ReturnType<typeof createClient>,
  profile: UserProfile,
) => PromiseLike<{ data: any; error: any }>

/**
 * Fetch data from Supabase, gated on auth profile being available.
 *
 * @param key  Cache/dedup key. Pass `null` to skip the query.
 * @param queryFn  Builds a Supabase query. Receives the client and the profile.
 * @param options  Optional configuration.
 */
export function useAuthSupabaseQuery<T = any>(
  key: string | string[] | null,
  queryFn: QueryFn,
  options: UseAuthQueryOptions<T> = {},
): UseAuthQueryResult<T> {
  const { enabled = true, select, refreshInterval = 0 } = options

  const profile = useAuthStore((s) => s.profile)

  // Determine the SWR key — null means "don't fetch"
  const swrKey = enabled && profile && key ? key : null

  const { data, error, isLoading, mutate } = useSWR<T>(
    swrKey,
    async () => {
      const supabase = getSupabase()
      const builder = queryFn(supabase, profile!)
      const { data: rawData, error: fetchError } = await builder

      if (fetchError) throw fetchError

      return select ? select(rawData) : (rawData as T)
    },
    {
      refreshInterval: refreshInterval || undefined,
      revalidateOnFocus: false,
    },
  )

  return {
    data: data ?? null,
    error: error ?? null,
    loading: isLoading,
    refetch: () => {
      mutate()
    },
  }
}

/**
 * Invalidate one or more SWR cache keys.
 * Useful after mutations to force refetch of related queries.
 */
export function invalidateKeys(keys: (string | string[])[]) {
  keys.forEach((key) => {
    globalMutate(key)
  })
}
