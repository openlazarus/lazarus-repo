'use client'

import * as m from 'motion/react-m'
import { useCallback, useEffect, useRef, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { getWorkspaceBaseUrl } from '@/hooks/data/use-workspace-api'
import type {
  Workspace as PollableWorkspace,
  WorkspaceStatus,
} from '@/hooks/features/workspace/types'
import { useProvisioningWatcher } from '@/hooks/features/workspace/use-provisioning-watcher'
import { api } from '@/lib/api-client'

interface WorkspacePreparingScreenProps {
  workspaceId: string
  status?: WorkspaceStatus
}

const HEADING = "We're preparing your workspace"
const SUBLINE = 'This will only take a moment.'
const ERROR_HEADING = "We couldn't get your workspace ready"
const ERROR_SUBLINE =
  'Something went wrong while setting things up. You can retry below.'

const REACHABILITY_POLL_INTERVAL_MS = 2_000
const REACHABILITY_MAX_DURATION_MS = 90_000

const probeWorkspaceReachable = async (
  workspaceId: string,
  signal: AbortSignal,
): Promise<void> => {
  const baseUrl = getWorkspaceBaseUrl(workspaceId)
  const startedAt = Date.now()
  while (!signal.aborted) {
    try {
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal,
        cache: 'no-store',
      })
      if (res.ok) return
    } catch {
      // DNS/network not ready yet — keep polling
    }
    if (Date.now() - startedAt > REACHABILITY_MAX_DURATION_MS) {
      throw new Error('Workspace reachability timeout')
    }
    await new Promise((r) => setTimeout(r, REACHABILITY_POLL_INTERVAL_MS))
  }
}

export function WorkspacePreparingScreen({
  workspaceId,
  status,
}: WorkspacePreparingScreenProps) {
  const { refreshWorkspaces } = useWorkspace()
  const [isRetrying, setIsRetrying] = useState(false)
  const [errored, setErrored] = useState(status === 'unhealthy')
  const [verifyingReachability, setVerifyingReachability] = useState(false)
  const reachabilityAbortRef = useRef<AbortController | null>(null)

  const pollableWorkspaces: PollableWorkspace[] = errored
    ? []
    : [{ id: workspaceId, status: 'starting' } as PollableWorkspace]

  useProvisioningWatcher(pollableWorkspaces, (_id, finalStatus) => {
    if (finalStatus === 'healthy') {
      setVerifyingReachability(true)
    } else {
      setErrored(true)
    }
  })

  useEffect(() => {
    if (!verifyingReachability) return
    const ctrl = new AbortController()
    reachabilityAbortRef.current = ctrl
    probeWorkspaceReachable(workspaceId, ctrl.signal)
      .then(() => {
        if (!ctrl.signal.aborted) void refreshWorkspaces()
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setErrored(true)
      })
    return () => ctrl.abort()
  }, [verifyingReachability, workspaceId, refreshWorkspaces])

  const retry = useCallback(async () => {
    setIsRetrying(true)
    setVerifyingReachability(false)
    reachabilityAbortRef.current?.abort()
    try {
      await api.post(`/api/workspaces/${workspaceId}/retry`, {})
      setErrored(false)
    } catch {
      setErrored(true)
    } finally {
      setIsRetrying(false)
    }
  }, [workspaceId])

  if (errored) {
    return (
      <ScreenShell>
        <Headline text={ERROR_HEADING} />
        <Subline text={ERROR_SUBLINE} />
        <RetryButton onClick={retry} isLoading={isRetrying} />
      </ScreenShell>
    )
  }

  return (
    <ScreenShell>
      <Headline text={HEADING} />
      <Subline text={SUBLINE} />
      <Spinner size='lg' />
    </ScreenShell>
  )
}

function ScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className='flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-6 px-6'>
      {children}
    </m.div>
  )
}

function Headline({ text }: { text: string }) {
  return (
    <m.h1
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, type: 'spring', stiffness: 380, damping: 28 }}
      className='text-center text-2xl font-semibold tracking-tight text-foreground'>
      {text}
    </m.h1>
  )
}

function Subline({ text }: { text: string }) {
  return (
    <m.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.3 }}
      className='max-w-md text-center text-sm text-[hsl(var(--text-secondary))]'>
      {text}
    </m.p>
  )
}

function RetryButton({
  onClick,
  isLoading,
}: {
  onClick: () => void
  isLoading: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className='mt-2 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60'>
      {isLoading ? <Spinner size='sm' /> : null}
      {isLoading ? 'Retrying…' : 'Retry'}
    </button>
  )
}
