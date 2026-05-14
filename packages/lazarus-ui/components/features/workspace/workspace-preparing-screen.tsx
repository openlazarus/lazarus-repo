'use client'

import * as m from 'motion/react-m'
import { useCallback, useEffect, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useWorkspace } from '@/hooks/core/use-workspace'
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
const NOT_PROVISIONED_HEADING = 'This workspace has no VM yet'
const NOT_PROVISIONED_SUBLINE =
  'Click below to provision the workspace. It will be ready in a couple of minutes.'

type ScreenState = 'preparing' | 'errored' | 'not_provisioned'

const initialState = (status?: WorkspaceStatus): ScreenState => {
  if (!status) return 'not_provisioned'
  if (status === 'unhealthy') return 'errored'
  return 'preparing'
}

export function WorkspacePreparingScreen({
  workspaceId,
  status,
}: WorkspacePreparingScreenProps) {
  const { refreshWorkspaces } = useWorkspace()
  const [isWorking, setIsWorking] = useState(false)
  const [screenState, setScreenState] = useState<ScreenState>(
    initialState(status),
  )

  const pollableWorkspaces: PollableWorkspace[] =
    screenState === 'preparing'
      ? [{ id: workspaceId, status: 'starting' } as PollableWorkspace]
      : []

  useProvisioningWatcher(pollableWorkspaces, (_id, finalStatus) => {
    if (finalStatus === 'healthy') {
      void refreshWorkspaces()
    } else {
      setScreenState('errored')
    }
  })

  useEffect(() => {
    setScreenState(initialState(status))
  }, [status])

  const trigger = useCallback(async () => {
    setIsWorking(true)
    try {
      await api.post(`/api/workspaces/${workspaceId}/retry`, {})
      setScreenState('preparing')
      void refreshWorkspaces()
    } catch {
      setScreenState('errored')
    } finally {
      setIsWorking(false)
    }
  }, [workspaceId, refreshWorkspaces])

  if (screenState === 'errored') {
    return (
      <ScreenShell>
        <Headline text={ERROR_HEADING} />
        <Subline text={ERROR_SUBLINE} />
        <ActionButton
          onClick={trigger}
          isLoading={isWorking}
          label='Retry'
          loadingLabel='Retrying…'
        />
      </ScreenShell>
    )
  }

  if (screenState === 'not_provisioned') {
    return (
      <ScreenShell>
        <Headline text={NOT_PROVISIONED_HEADING} />
        <Subline text={NOT_PROVISIONED_SUBLINE} />
        <ActionButton
          onClick={trigger}
          isLoading={isWorking}
          label='Provision workspace'
          loadingLabel='Provisioning…'
        />
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

function ActionButton({
  onClick,
  isLoading,
  label,
  loadingLabel,
}: {
  onClick: () => void
  isLoading: boolean
  label: string
  loadingLabel: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className='mt-2 inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60'>
      {isLoading ? <Spinner size='sm' /> : null}
      {isLoading ? loadingLabel : label}
    </button>
  )
}
