'use client'

import { useAuthGetLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { WorkspaceListResponse } from './types'

export const useGetUserWorkspaces = () =>
  useAuthGetLazarusApi<WorkspaceListResponse>({ path: '/api/workspaces' })
