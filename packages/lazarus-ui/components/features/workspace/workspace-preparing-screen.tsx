'use client'

import * as m from 'motion/react-m'
import { useCallback, useEffect, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useWorkspace } from '@/hooks/core/use-workspace'
import type {
  Workspace as PollableWorkspace,
  WorkspaceStatus,
} from '@/hooks/features/workspace/types'
import { useCreateWorkspace } from '@/hooks/features/workspace/use-create-workspace'
import { useProvisioningWatcher } from '@/hooks/features/workspace/use-provisioning-watcher'
import { useStartWorkspace } from '@/hooks/features/workspace/use-start-workspace'
import { api } from '@/lib/api-client'
import { useAuthStore } from '@/store/auth-store'
import { useWorkspaceStore } from '@/store/workspace-store'

interface WorkspacePreparingScreenProps {
  workspaceId: string
  status?: WorkspaceStatus
  ownerId?: string
}

const HEADING = "We're preparing your workspace"
const SUBLINE = 'This will only take a moment.'
const ERROR_HEADING = "We couldn't get your workspace ready"
const ERROR_SUBLINE =
  'Something went wrong while setting things up. You can retry below.'
const NOT_PROVISIONED_HEADING = 'This workspace has no VM yet'
const NOT_PROVISIONED_SUBLINE =
  'Click below to provision the workspace. It will be ready in a couple of minutes.'
const STOPPED_HEADING = 'This workspace is asleep'
const STOPPED_SUBLINE_OWNER =
  'It was stopped after 30 days of inactivity to save resources. Your data is safe — turn it back on to resume.'
const STOPPED_SUBLINE_VIEWER =
  'It was stopped after 30 days of inactivity. Only the workspace owner can turn it back on.'

type ScreenState = 'preparing' | 'errored' | 'not_provisioned' | 'stopped'

const initialState = (status?: WorkspaceStatus): ScreenState => {
  if (!status || status === 'not_provisioned') return 'not_provisioned'
  if (status === 'unhealthy') return 'errored'
  if (status === 'stopped') return 'stopped'
  return 'preparing'
}

export function WorkspacePreparingScreen({
  workspaceId,
  status,
  ownerId,
}: WorkspacePreparingScreenProps) {
  const { refreshWorkspaces } = useWorkspace()
  const [startWorkspaceVm, { loading: isStartLoading }] =
    useStartWorkspace(workspaceId)
  const [createWorkspace, { loading: isCreatingWorkspace }] =
    useCreateWorkspace()
  const setActiveWorkspace = useWorkspaceStore((s) => s.setActiveWorkspace)
  const currentUserId = useAuthStore((s) => s.userId)
  const isOwner = !!ownerId && !!currentUserId && ownerId === currentUserId
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

  const triggerStart = useCallback(async () => {
    try {
      await startWorkspaceVm()
      setScreenState('preparing')
      void refreshWorkspaces()
    } catch {
      setScreenState('errored')
    }
  }, [refreshWorkspaces, startWorkspaceVm])

  // Escape hatch for a non-owner whose only access is a stopped workspace:
  // spin up their own one-click. New workspace becomes active so the layout
  // re-renders into its preparing/healthy state automatically.
  const triggerCreate = useCallback(async () => {
    const newId = await createWorkspace()
    await refreshWorkspaces()
    if (newId) setActiveWorkspace(newId)
  }, [createWorkspace, refreshWorkspaces, setActiveWorkspace])

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

  if (screenState === 'stopped') {
    return (
      <ScreenShell>
        <Headline text={STOPPED_HEADING} />
        <Subline
          text={isOwner ? STOPPED_SUBLINE_OWNER : STOPPED_SUBLINE_VIEWER}
        />
        {isOwner ? (
          <ActionButton
            onClick={triggerStart}
            isLoading={isStartLoading}
            label='Turn on'
            loadingLabel='Starting…'
          />
        ) : (
          <ActionButton
            onClick={triggerCreate}
            isLoading={isCreatingWorkspace}
            label='Create your own workspace'
            loadingLabel='Creating…'
          />
        )}
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
