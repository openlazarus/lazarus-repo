'use client'

import { useEffect, useRef } from 'react'

import { api } from '@/lib/api-client'
import type { Workspace, WorkspaceStatus } from './types'

const POLL_INTERVAL_MS = 4_000
const MAX_POLL_DURATION_MS = 5 * 60 * 1_000

/**
 * Polls /api/workspaces/:id/status for any workspaces currently in `starting`
 * state and calls `onSettled(id, finalStatus)` when each one flips. The caller
 * is expected to refresh its workspace list after that so the row re-renders
 * with the new status badge.
 */
export function useProvisioningWatcher(
  workspaces: Workspace[],
  onSettled: (workspaceId: string, status: WorkspaceStatus) => void,
): void {
  const onSettledRef = useRef(onSettled)
  onSettledRef.current = onSettled

  const startingIds = workspaces
    .filter((w) => w.status === 'starting')
    .map((w) => w.id)
  const startingKey = startingIds.join(',')

  useEffect(() => {
    if (startingIds.length === 0) return

    const startedAt = Date.now()
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const poll = async () => {
      if (cancelled) return
      await Promise.all(
        startingIds.map(async (id) => {
          if (cancelled) return
          try {
            const data = await api.get<{ id: string; status: WorkspaceStatus }>(
              `/api/workspaces/${id}/status`,
            )
            if (data.status !== 'starting') {
              onSettledRef.current(id, data.status)
            }
          } catch {
            // transient (VM still booting / network blip) — keep polling
          }
        }),
      )

      if (cancelled) return
      if (Date.now() - startedAt > MAX_POLL_DURATION_MS) return
      timer = setTimeout(poll, POLL_INTERVAL_MS)
    }

    void poll()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [startingKey])
}
