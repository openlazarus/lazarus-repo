'use client'

import * as m from 'motion/react-m'
import { useCallback, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useCreateWorkspace } from '@/hooks/features/workspace/use-create-workspace'

const HEADING = "You don't have any workspaces yet"
const SUBLINE =
  'Create your first workspace to get started. You can also be invited to a team workspace by an admin.'

export function NoWorkspacesScreen() {
  const { refreshWorkspaces } = useWorkspace()
  const [createWorkspace, { loading: isCreating }] = useCreateWorkspace()
  const [error, setError] = useState<string | null>(null)

  const handleCreate = useCallback(async () => {
    setError(null)
    const id = await createWorkspace()
    if (!id) {
      setError('We couldn’t create your workspace. Please try again.')
      return
    }
    await refreshWorkspaces()
  }, [createWorkspace, refreshWorkspaces])

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className='flex h-full min-h-[400px] w-full flex-col items-center justify-center gap-6 px-6'>
      <m.h1
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 380, damping: 28 }}
        className='text-center text-2xl font-semibold tracking-tight text-foreground'>
        {HEADING}
      </m.h1>
      <m.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.3 }}
        className='max-w-md text-center text-sm text-[hsl(var(--text-secondary))]'>
        {SUBLINE}
      </m.p>
      <button
        onClick={handleCreate}
        disabled={isCreating}
        className='inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-60'>
        {isCreating ? <Spinner size='sm' /> : null}
        {isCreating ? 'Creating workspace…' : 'Create your first workspace'}
      </button>
      {error ? (
        <p className='text-center text-sm text-red-500'>{error}</p>
      ) : null}
    </m.div>
  )
}
