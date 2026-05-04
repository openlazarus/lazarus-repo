import { PostgrestError } from '@supabase/postgrest-js'
import { StorageError } from '@supabase/storage-js'
import { useCallback, useState } from 'react'

import { createClient } from '@/utils/supabase/client'

interface UseSupabaseMutationOptions<T, V> {
  onSuccess?: (data: T | null, variables?: V) => void
  onError?: (error: Error | PostgrestError | StorageError) => void
}

/**
 * Simple hook for Supabase mutations without caching
 */
export function useSupabaseMutation<T = any, V = any>(
  mutationFn: (
    supabase: ReturnType<typeof createClient>,
    variables: V,
  ) => Promise<{ data: T | null; error: Error | null }>,
  options?: UseSupabaseMutationOptions<T, V>,
) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const mutate = useCallback(
    async (variables: V): Promise<T | null> => {
      setIsLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const result = await mutationFn(supabase, variables)

        if (result.error) {
          throw result.error
        }

        if (options?.onSuccess) {
          options.onSuccess(result.data, variables)
        }

        setIsLoading(false)
        return result.data
      } catch (err) {
        const error = err as Error
        setError(error)
        setIsLoading(false)

        if (options?.onError) {
          options.onError(error)
        }

        throw error
      }
    },
    [mutationFn, options],
  )

  return [mutate, { isLoading, error }] as const
}
