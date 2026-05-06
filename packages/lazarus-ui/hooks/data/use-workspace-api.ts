'use client'

import { getWorkspaceIdFromContext } from '@/lib/api-client'

import {
  GetProps,
  MutationProps,
  useAuthDelete,
  useAuthGet,
  useAuthPatch,
  useAuthPost,
  useAuthPut,
  useDelete,
  useGet,
  usePatch,
  usePost,
  usePut,
} from './use-api-request'

export const getWorkspaceBaseUrl = (workspaceId?: string): string => {
  const override = process.env.NEXT_PUBLIC_WORKSPACE_API_URL
  if (override) return override

  const baseDomain =
    process.env.NEXT_PUBLIC_WORKSPACE_BASE_DOMAIN || 'localhost'
  const wsId = workspaceId || getWorkspaceIdFromContext()
  if (!wsId) return 'http://localhost:8000'

  return `https://${wsId}.${baseDomain}`
}

// Prefer an explicit `workspaceId` from props.params over sessionStorage so
// hooks render correctly on first paint after a hard refresh, before the
// workspace context has been hydrated into sessionStorage.
const resolveBase = <P extends { params?: { workspaceId?: string } }>(
  props: P,
): string => getWorkspaceBaseUrl(props.params?.workspaceId)

export const useGetWorkspaceApi = <T>(props: Omit<GetProps<T>, 'baseURL'>) =>
  useGet<T>({ ...props, baseURL: resolveBase(props) })

export const usePostWorkspaceApi = <T, C = any>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => usePost<T, C>({ ...props, baseURL: resolveBase(props) })

export const usePutWorkspaceApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => usePut<T>({ ...props, baseURL: resolveBase(props) })

export const usePatchWorkspaceApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => usePatch<T>({ ...props, baseURL: resolveBase(props) })

export const useDeleteWorkspaceApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useDelete<T>({ ...props, baseURL: resolveBase(props) })

export const useAuthGetWorkspaceApi = <T>(
  props: Omit<GetProps<T>, 'baseURL'>,
) => useAuthGet<T>({ ...props, baseURL: resolveBase(props) })

export const useAuthPostWorkspaceApi = <T, C = any>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthPost<T, C>({ ...props, baseURL: resolveBase(props) })

export const useAuthPutWorkspaceApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthPut<T>({ ...props, baseURL: resolveBase(props) })

export const useAuthPatchWorkspaceApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthPatch<T>({ ...props, baseURL: resolveBase(props) })

export const useAuthDeleteWorkspaceApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthDelete<T>({ ...props, baseURL: resolveBase(props) })
