'use client'

import { AxiosRequestConfig } from 'axios'
import qs from 'qs'
import { useCallback, useMemo, useRef, useState } from 'react'
import useSWR, { SWRConfiguration } from 'swr'

import { apiClient, getWorkspaceIdFromContext } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'

// All HTTP requests now flow through `apiClient`, which already:
//   - injects a fresh Supabase JWT via async getAccessToken() in its request
//     interceptor (fixes stale-token 401s that used to require a hard refresh)
//   - injects x-workspace-id and x-team-id from context
//   - centralizes 401 handling (signOut + redirect)
//
// `useRequest` adds: a memoized `call(data?)` function so consumers can put it
// in `useEffect` deps without infinite loops, plus loading/error/data state.

const DEFAULT_BASE_URL =
  process.env.NEXT_PUBLIC_LAZARUS_API_URL || 'http://localhost:8080'

export const useRequest = <ReturnType, CallType = any>({
  baseURL = DEFAULT_BASE_URL,
  path,
  headers,
  params,
  method,
  initialState = {} as ReturnType,
  onSuccess = () => {},
  onError = () => {},
}: {
  baseURL?: string
  path: string
  headers?: AxiosRequestConfig['headers']
  params?: AxiosRequestConfig['params']
  initialState?: ReturnType
  method: 'get' | 'post' | 'put' | 'delete' | 'patch'
  onSuccess?: (data: ReturnType) => void
  onError?: (error: any) => void
}) => {
  const [data, setData] = useState<ReturnType>(initialState)
  const [error, setError] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  // Stable serialized keys so the call function only re-creates when the
  // request shape actually changes. Prevents `useEffect(() => {}, [call])`
  // infinite loops when callers pass through `headers`/`params` objects that
  // are reconstructed each render.
  const headersKey = useMemo(
    () => (headers ? JSON.stringify(headers) : ''),
    [headers],
  )
  const paramsKey = useMemo(
    () => (params ? JSON.stringify(params) : ''),
    [params],
  )

  // Stash mutable values in refs so the memoized call doesn't re-create on
  // every render when callers pass inline objects/arrow callbacks.
  const onSuccessRef = useRef(onSuccess)
  const onErrorRef = useRef(onError)
  const headersRef = useRef(headers)
  const paramsRef = useRef(params)
  onSuccessRef.current = onSuccess
  onErrorRef.current = onError
  headersRef.current = headers
  paramsRef.current = params

  const call = useCallback(
    async (body?: CallType): Promise<ReturnType | undefined> => {
      setLoading(true)
      setError(null)
      try {
        const response = await apiClient.request<ReturnType>({
          baseURL,
          url: path,
          method,
          params: paramsRef.current,
          data: body,
          headers: headersRef.current,
        })
        setData(response.data)
        onSuccessRef.current(response.data)
        return response.data
      } catch (err) {
        setError(err)
        onErrorRef.current(err)
      } finally {
        setLoading(false)
      }
    },
    [baseURL, path, method, headersKey, paramsKey],
  )

  return [call, { data: data as ReturnType, loading, error }] as const
}

export type GetProps<T> = {
  baseURL?: string
  path: string
  initialState?: T
  headers?: Record<string, string>
  params?: Record<string, any>
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
  config?: SWRConfiguration
  enabled?: boolean
}

export type MutationProps<T> = {
  baseURL?: string
  path: string
  headers?: AxiosRequestConfig['headers']
  params?: AxiosRequestConfig['params']
  onSuccess?: (data: T) => void
  onError?: (error: any) => void
}

type Props<T> = GetProps<T>

export const useGet = <T>({
  baseURL = DEFAULT_BASE_URL,
  path,
  initialState,
  headers = {},
  params = {},
  onSuccess = () => {},
  onError = () => {},
  config = {},
  enabled = true,
}: Props<T>) => {
  const fetcher = async (key: string[]) => {
    const response = await apiClient.get(key[0], {
      baseURL,
      headers,
      params,
      paramsSerializer: (p) => qs.stringify(p, { arrayFormat: 'comma' }),
    })
    return response.data
  }

  const key = path && enabled ? [path, JSON.stringify(params)] : null

  const { data, error, isLoading, mutate, isValidating } = useSWR<T>(
    key,
    fetcher,
    {
      onSuccess,
      onError,
      fallbackData: initialState,
      revalidateOnFocus: false,
      ...config,
    },
  )

  return {
    data: data || (initialState as T),
    loading: isLoading,
    validating: isValidating,
    error,
    mutate,
  } as const
}

export const usePost = <ReturnType, CallType = any>({
  baseURL,
  path,
  headers,
  params,
  onSuccess = () => {},
  onError = () => {},
}: MutationProps<ReturnType>) => {
  return useRequest<ReturnType, CallType>({
    baseURL,
    path,
    headers,
    params,
    method: 'post',
    onSuccess,
    onError,
  })
}

export const usePut = <T>({
  baseURL,
  path,
  headers,
  params,
  onSuccess = () => {},
  onError = () => {},
}: MutationProps<T>) => {
  return useRequest<T>({
    baseURL,
    path,
    headers,
    params,
    method: 'put',
    onSuccess,
    onError,
  })
}

export const useDelete = <T>({
  baseURL,
  path,
  headers,
  params,
  onSuccess = () => {},
  onError = () => {},
}: MutationProps<T>) => {
  return useRequest<T>({
    baseURL,
    path,
    headers,
    params,
    method: 'delete',
    onSuccess,
    onError,
  })
}

export const usePatch = <T>({
  baseURL,
  path,
  headers,
  params,
  onSuccess = () => {},
  onError = () => {},
}: MutationProps<T>) => {
  return useRequest<T>({
    baseURL,
    path,
    headers,
    params,
    method: 'patch',
    onSuccess,
    onError,
  })
}

// `useAuthHeaders` is kept for backward-compat with callers that compose
// extra headers, but it now returns ONLY the workspace context override —
// auth + team + workspace headers are injected by apiClient.
export const useAuthHeaders = () => {
  const session = useAuthStore((s) => s.session)
  const workspaceId = getWorkspaceIdFromContext()
  return {
    ...(session && { Authorization: `Bearer ${session.access_token}` }),
    ...(workspaceId && { 'x-workspace-id': workspaceId }),
  }
}

// Auth* variants no longer add Authorization manually — apiClient does that
// asynchronously via getAccessToken() so a stale Zustand session doesn't
// produce a 401. Callers that need to gate the fetch until session is loaded
// can keep using `enabled` / `path: ''` patterns.
export const useAuthPost = <ReturnType, CallType = any>(
  props: MutationProps<ReturnType>,
) => useRequest<ReturnType, CallType>({ ...props, method: 'post' })

export const useAuthGet = <T>({ enabled = true, ...props }: Props<T>) => {
  const session = useAuthStore((s) => s.session)
  const hasAuth = !!session?.access_token
  return useGet<T>({
    ...props,
    // Skip fetch until session is available (prevents 401 on first render).
    enabled: enabled && hasAuth,
  })
}

export const useAuthPut = <T>(props: MutationProps<T>) =>
  useRequest<T>({ ...props, method: 'put' })

export const useAuthDelete = <T>(props: MutationProps<T>) =>
  useRequest<T>({ ...props, method: 'delete' })

export const useAuthPatch = <T>(props: MutationProps<T>) =>
  useRequest<T>({ ...props, method: 'patch' })
