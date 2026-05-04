/**
 * Auth-aware API hooks backed by SWR (GET) and the api client (mutations).
 *
 * All hooks use the centralized api-client for JWT injection.
 * Consumers never import SWR directly.
 */

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'

import { api } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'

// === GET hook (SWR-backed) ===

interface UseAuthApiGetOptions {
  /** Extra query params appended to the URL */
  params?: Record<string, any>
  /** Skip fetch when false */
  enabled?: boolean
  /** Polling interval in ms (0 = disabled) */
  refreshInterval?: number
}

interface UseAuthApiGetResult<T> {
  data: T | undefined
  loading: boolean
  error: any
  refetch: () => void
}

/**
 * SWR-backed GET hook. Uses `api.get()` which auto-injects JWT.
 *
 * @param key  API path used as both the request URL and SWR cache key. Pass `null` to skip.
 * @param options  Configuration.
 */
export function useAuthApiGet<T = any>(
  key: string | null,
  options: UseAuthApiGetOptions = {},
): UseAuthApiGetResult<T> {
  const { params, enabled = true, refreshInterval = 0 } = options

  const profile = useAuthStore((s) => s.profile)

  // Build SWR key — null means "don't fetch"
  const swrKey = enabled && profile && key ? key : null

  const { data, error, isLoading, mutate } = useSWR<T>(
    swrKey,
    async (url: string) => {
      return api.get<T>(url, { params })
    },
    {
      refreshInterval: refreshInterval || undefined,
      revalidateOnFocus: false,
    },
  )

  return {
    data,
    loading: isLoading,
    error: error ?? null,
    refetch: () => {
      mutate()
    },
  }
}

// === Mutation hooks (imperative, no SWR) ===

interface MutationOptions<TRes> {
  /** SWR keys to invalidate after success */
  invalidateKeys?: string[]
  onSuccess?: (data: TRes) => void
  onError?: (error: any) => void
}

function useMutation<TRes, TBody = any>(
  method: 'post' | 'put' | 'patch' | 'delete',
  path: string,
  options: MutationOptions<TRes> = {},
): [
  (body?: TBody) => Promise<TRes>,
  { data: TRes | undefined; loading: boolean; error: any },
] {
  const [data, setData] = useState<TRes | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const execute = async (body?: TBody): Promise<TRes> => {
    setLoading(true)
    setError(null)

    try {
      let result: TRes

      if (method === 'delete') {
        result = await api.delete<TRes>(path)
      } else {
        const fn = api[method] as (path: string, data?: any) => Promise<TRes>
        result = await fn(path, body)
      }

      setData(result)

      // Invalidate SWR keys
      if (options.invalidateKeys) {
        options.invalidateKeys.forEach((key) => globalMutate(key))
      }

      options.onSuccess?.(result)
      return result
    } catch (err) {
      setError(err)
      options.onError?.(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return [execute, { data, loading, error }]
}

export function useAuthApiPost<TRes = any, TBody = any>(
  path: string,
  options?: MutationOptions<TRes>,
) {
  return useMutation<TRes, TBody>('post', path, options)
}

export function useAuthApiPut<TRes = any, TBody = any>(
  path: string,
  options?: MutationOptions<TRes>,
) {
  return useMutation<TRes, TBody>('put', path, options)
}

export function useAuthApiPatch<TRes = any, TBody = any>(
  path: string,
  options?: MutationOptions<TRes>,
) {
  return useMutation<TRes, TBody>('patch', path, options)
}

export function useAuthApiDelete<TRes = any>(
  path: string,
  options?: MutationOptions<TRes>,
) {
  return useMutation<TRes>('delete', path, options)
}
