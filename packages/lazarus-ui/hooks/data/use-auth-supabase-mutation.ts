/**
 * Auth-aware Supabase mutation hook with optional SWR cache invalidation.
 *
 * Stable interface — consumers don't depend on SWR internals.
 */

import { useState } from 'react'
import { mutate as globalMutate } from 'swr'

import { UserProfile } from '@/model/user-profile'
import { useAuthStore } from '@/store/auth-store'
import { createClient } from '@/utils/supabase/client'

// Singleton client
let supabaseClient: ReturnType<typeof createClient> | null = null
const getSupabase = () => {
  if (!supabaseClient) supabaseClient = createClient()
  return supabaseClient
}

// === INTERFACE ===

interface UseAuthMutationOptions<T, V> {
  onSuccess?: (data: T | null, variables?: V) => void
  onError?: (error: Error) => void
  /** SWR keys to invalidate (refetch) after a successful mutation */
  invalidateKeys?: (string | string[])[]
}

type MutationFn<T, V> = (
  supabase: ReturnType<typeof createClient>,
  variables: V,
  profile: UserProfile,
) => Promise<{ data: T | null; error: any }>

/**
 * Imperative mutation hook for Supabase operations.
 *
 * Returns a tuple: [executeFn, { isLoading, error }]
 */
export function useAuthSupabaseMutation<T = any, V = any>(
  mutationFn: MutationFn<T, V>,
  options: UseAuthMutationOptions<T, V> = {},
): [
  (variables: V) => Promise<T | null>,
  { isLoading: boolean; error: Error | null },
] {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const profile = useAuthStore((s) => s.profile)

  const execute = async (variables: V): Promise<T | null> => {
    if (!profile) {
      const err = new Error('Not authenticated')
      setError(err)
      options.onError?.(err)
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      const supabase = getSupabase()
      const { data, error: mutationError } = await mutationFn(
        supabase,
        variables,
        profile,
      )

      if (mutationError) throw mutationError

      // Invalidate related SWR cache keys
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => {
          globalMutate(key)
        })
      }

      options.onSuccess?.(data, variables)
      return data
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      setError(error)
      options.onError?.(error)
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return [execute, { isLoading, error }]
}
