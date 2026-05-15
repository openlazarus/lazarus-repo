'use client'

import { useAuthPostLazarusApi } from '@/hooks/data/use-lazarus-api'

import type { WorkspaceStatus } from './types'

/**
 * Resume a workspace whose VM is in 'stopped' state (auto-shutdown after
 * 30d of inactivity). Backend rejects with 403 if the caller isn't the
 * workspace owner. Returns the standard `[call, { data, loading, error }]`
 * tuple from the lazarus api primitive.
 */
export const useStartWorkspace = (workspaceId: string) =>
  useAuthPostLazarusApi<{ id: string; status: WorkspaceStatus }>({
    path: `/api/workspaces/${workspaceId}/start`,
  })
