'use client'

import { useCallback, useState } from 'react'

import { api } from '@/lib/api-client'

/**
 * Triggers provisioning for a workspace that doesn't yet have a VM.
 * Calls POST /api/workspaces/:id/retry which (re)provisions and flips the
 * workspace_instances row to status='starting'. The selector/preparing screen
 * watcher then polls until it goes 'healthy'.
 */
export function useProvisionWorkspace(): {
  provision: (workspaceId: string) => Promise<void>
  isProvisioning: boolean
  error: string | null
} {
  const [isProvisioning, setIsProvisioning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const provision = useCallback(async (workspaceId: string): Promise<void> => {
    setIsProvisioning(true)
    setError(null)
    try {
      await api.post(`/api/workspaces/${workspaceId}/retry`, {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to provision workspace')
      throw e
    } finally {
      setIsProvisioning(false)
    }
  }, [])

  return { provision, isProvisioning, error }
}
