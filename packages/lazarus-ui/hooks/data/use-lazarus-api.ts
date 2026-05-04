'use client'

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

const LAZARUS_BASE_URL =
  process.env.NEXT_PUBLIC_LAZARUS_API_URL || 'http://localhost:8080'

export const useGetLazarusApi = <T>(props: Omit<GetProps<T>, 'baseURL'>) =>
  useGet<T>({ ...props, baseURL: LAZARUS_BASE_URL })

export const usePostLazarusApi = <T, C = any>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => usePost<T, C>({ ...props, baseURL: LAZARUS_BASE_URL })

export const usePutLazarusApi = <T>(props: Omit<MutationProps<T>, 'baseURL'>) =>
  usePut<T>({ ...props, baseURL: LAZARUS_BASE_URL })

export const usePatchLazarusApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => usePatch<T>({ ...props, baseURL: LAZARUS_BASE_URL })

export const useDeleteLazarusApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useDelete<T>({ ...props, baseURL: LAZARUS_BASE_URL })

export const useAuthGetLazarusApi = <T>(props: Omit<GetProps<T>, 'baseURL'>) =>
  useAuthGet<T>({ ...props, baseURL: LAZARUS_BASE_URL })

export const useAuthPostLazarusApi = <T, C = any>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthPost<T, C>({ ...props, baseURL: LAZARUS_BASE_URL })

export const useAuthPutLazarusApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthPut<T>({ ...props, baseURL: LAZARUS_BASE_URL })

export const useAuthPatchLazarusApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthPatch<T>({ ...props, baseURL: LAZARUS_BASE_URL })

export const useAuthDeleteLazarusApi = <T>(
  props: Omit<MutationProps<T>, 'baseURL'>,
) => useAuthDelete<T>({ ...props, baseURL: LAZARUS_BASE_URL })
