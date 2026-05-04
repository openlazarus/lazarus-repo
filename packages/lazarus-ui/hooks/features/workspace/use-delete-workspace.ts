'use client'

import { useAuthDeleteLazarusApi } from '@/hooks/data/use-lazarus-api'

export const useDeleteWorkspace = (workspaceId: string) =>
  useAuthDeleteLazarusApi<void>({
    path: `/api/workspaces/${workspaceId}`,
  })
