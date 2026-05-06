'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import React, { useMemo, useState } from 'react'

import { WorkspaceAgentCount } from '@/components/features/agents/workspace-agent-count'
import Spinner from '@/components/ui/spinner'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useCreateWorkspace } from '@/hooks/features/workspace/use-create-workspace'
import { useProvisioningWatcher } from '@/hooks/features/workspace/use-provisioning-watcher'
import { cn } from '@/lib/utils'
import { Workspace } from '@/model/workspace'
import { useWorkspaceStore } from '@/store/workspace-store'

interface WorkspaceSelectorProps {
  isDark: boolean
}

/**
 * Renders the workspace icon based on avatar, color, or default fallback
 * Styled to match the user avatar in the sidebar
 */
function WorkspaceIcon({
  workspace,
  isDark,
  size = 'lg',
}: {
  workspace: Workspace | undefined
  isDark: boolean
  size?: 'sm' | 'lg'
}) {
  const sizeClasses = size === 'lg' ? 'h-11 w-11' : 'h-6 w-6'
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs'

  if (workspace?.avatar) {
    return (
      <div
        className={cn(
          sizeClasses,
          'flex-shrink-0 overflow-hidden rounded-full',
          isDark ? 'bg-white/10' : 'bg-black/5',
        )}>
        <img
          src={workspace.avatar}
          alt=''
          className='h-full w-full object-cover'
        />
      </div>
    )
  }

  if (workspace?.color) {
    return (
      <div
        className={cn(
          sizeClasses,
          'flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold text-white',
        )}
        style={{ backgroundColor: workspace.color }}>
        <span className={textSize}>
          {workspace.name?.charAt(0).toUpperCase() || 'W'}
        </span>
      </div>
    )
  }

  return (
    <div
      className={cn(
        sizeClasses,
        'flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full',
        isDark ? 'bg-white/10' : 'bg-black/5',
      )}>
      <span
        className={cn(
          textSize,
          'font-semibold',
          isDark ? 'text-white/60' : 'text-black/40',
        )}>
        {workspace?.name?.charAt(0).toUpperCase() || 'W'}
      </span>
    </div>
  )
}

export const WorkspaceSelector = ({ isDark }: WorkspaceSelectorProps) => {
  const {
    workspaces,
    isLoading: loading,
    selectWorkspace,
    refreshWorkspaces,
  } = useWorkspace()
  // Use Zustand store directly for activeWorkspaceId for consistency
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  )
  const [isExpanded, setIsExpanded] = useState(false)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)
  const [createWorkspace] = useCreateWorkspace()

  // Get current workspace
  const currentWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  )

  // Group and sort workspaces by team
  const { groupedWorkspaces, personalWorkspaces } = useMemo(() => {
    const grouped: Record<
      string,
      { teamName: string; workspaces: typeof workspaces }
    > = {}
    const personal: typeof workspaces = []

    workspaces.forEach((ws) => {
      if (ws.teamId && ws.teamName) {
        if (!grouped[ws.teamId]) {
          grouped[ws.teamId] = { teamName: ws.teamName, workspaces: [] }
        }
        grouped[ws.teamId].workspaces.push(ws)
      } else {
        personal.push(ws)
      }
    })

    // Sort workspaces within each group by name
    Object.values(grouped).forEach((group) => {
      group.workspaces.sort((a, b) => a.name.localeCompare(b.name))
    })
    personal.sort((a, b) => a.name.localeCompare(b.name))

    return { groupedWorkspaces: grouped, personalWorkspaces: personal }
  }, [workspaces])

  // Flatten for display
  const sortedWorkspaces = useMemo(() => {
    const result: typeof workspaces = []

    // Add personal workspaces first
    result.push(...personalWorkspaces)

    // Add team workspaces grouped by team
    Object.entries(groupedWorkspaces)
      .sort(([, a], [, b]) => a.teamName.localeCompare(b.teamName))
      .forEach(([, group]) => {
        result.push(...group.workspaces)
      })

    return result
  }, [personalWorkspaces, groupedWorkspaces])

  // Auto-select first workspace if none selected
  React.useEffect(() => {
    console.log('[WorkspaceSelector] Check auto-selection:', {
      loading,
      workspacesCount: workspaces.length,
      activeWorkspaceId,
    })

    if (!loading && workspaces.length > 0 && !activeWorkspaceId) {
      // Skip workspaces that haven't finished provisioning — selecting them
      // would route the UI at a workspace VM that isn't ready yet.
      const ready = workspaces.find(
        (w) => (w.status ?? 'healthy') === 'healthy',
      )
      if (ready) {
        console.log(
          '[WorkspaceSelector] Auto-selecting first ready workspace:',
          ready.name,
        )
        selectWorkspace(ready.id)
      }
    }
  }, [loading, workspaces, activeWorkspaceId, selectWorkspace])

  // Poll /:id/status for any provisioning workspaces. When one flips, refresh
  // the list so the row re-renders with the new status (and becomes clickable).
  useProvisioningWatcher(workspaces, () => {
    void refreshWorkspaces()
  })

  const handleWorkspaceSelect = (workspace: Workspace) => {
    if ((workspace.status ?? 'healthy') !== 'healthy') {
      // Provisioning or failed — don't switch active workspace yet.
      return
    }
    selectWorkspace(workspace.id)
    setIsExpanded(false)
  }

  const handleAddWorkspace = async () => {
    setIsCreatingWorkspace(true)
    setIsExpanded(false)

    try {
      // Create a new workspace with a default name
      const newWorkspaceId = await createWorkspace()
      console.log('[WorkspaceSelector] Created workspace:', newWorkspaceId)

      if (newWorkspaceId) {
        // Refresh the list so the new workspace appears with status='starting'.
        // Do NOT auto-switch the active workspace — the VM is still booting and
        // would 404 every workspace-VM endpoint. The user keeps their current
        // context; they can click the new workspace once it goes 'healthy'.
        await refreshWorkspaces()
        console.log(
          '[WorkspaceSelector] New workspace queued for provisioning:',
          newWorkspaceId,
        )
      } else {
        console.error(
          '[WorkspaceSelector] No workspace ID returned from creation',
        )
      }
    } catch (error) {
      console.error('[WorkspaceSelector] Failed to create workspace:', error)
    } finally {
      setIsCreatingWorkspace(false)
    }
  }

  if (loading) {
    return (
      <div className='flex items-center justify-center px-4 py-3'>
        <Spinner size='sm' />
      </div>
    )
  }

  if (workspaces.length === 0) {
    return null
  }

  return (
    <div className='relative'>
      {/* Current Workspace Button */}
      <m.button
        whileTap={{ scale: 0.99 }}
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full px-4 py-3 transition-colors duration-200',
          'hover:bg-[hsl(var(--border))]',
        )}>
        <div className='flex items-center justify-between gap-2.5'>
          <div className='flex min-w-0 flex-1 items-center gap-3'>
            <WorkspaceIcon
              workspace={currentWorkspace}
              isDark={isDark}
              size='lg'
            />
            <div className='min-w-0 flex-1 text-left'>
              <div className='text-xs text-[hsl(var(--text-tertiary))]'>
                Workspace
              </div>
              <div className='truncate text-[14px] font-semibold'>
                {currentWorkspace?.name || 'Select workspace'}
              </div>
            </div>
          </div>
          <m.div
            animate={{
              rotate: isExpanded ? 0 : 180,
            }}
            transition={{
              duration: 0.4,
              ease: [0.34, 1.56, 0.64, 1],
            }}
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center',
              'text-[hsl(var(--text-secondary))]',
            )}>
            <svg width={16} height={16} viewBox='0 0 16 16' fill='none'>
              <path
                d='M4 6L8 10L12 6'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          </m.div>
        </div>
      </m.button>

      {/* Dropdown Menu */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <m.div
            initial={{ height: 0, opacity: 0 }}
            animate={{
              height: 'auto',
              opacity: 1,
              transition: {
                height: {
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                },
                opacity: {
                  duration: 0.2,
                  delay: 0.1,
                },
              },
            }}
            exit={{
              height: 0,
              opacity: 0,
              transition: {
                height: {
                  duration: 0.25,
                  ease: [0.25, 0.46, 0.45, 0.94],
                },
                opacity: {
                  duration: 0.15,
                },
              },
            }}
            className='overflow-hidden'>
            <div className='max-h-[240px] space-y-0.5 overflow-y-auto px-4 pb-2 pt-1'>
              {sortedWorkspaces
                .filter((workspace) => workspace.id !== activeWorkspaceId)
                .map((workspace, index) => {
                  const status = workspace.status ?? 'healthy'
                  const isStarting = status === 'starting'
                  const isFailed = status === 'unhealthy'
                  const interactive = !isStarting && !isFailed
                  return (
                    <m.button
                      key={workspace.id}
                      initial={{ x: -10, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: 0.05 * index, duration: 0.2 }}
                      onClick={() => handleWorkspaceSelect(workspace)}
                      disabled={!interactive}
                      aria-disabled={!interactive}
                      className={cn(
                        'w-full rounded-lg px-3 py-2 text-left transition-colors',
                        interactive
                          ? 'hover:bg-[hsl(var(--border))]'
                          : 'cursor-default opacity-70',
                      )}>
                      <div className='flex items-center gap-2'>
                        <WorkspaceIcon
                          workspace={workspace}
                          isDark={isDark}
                          size='sm'
                        />
                        <div className='min-w-0 flex-1'>
                          <div className='flex items-center gap-2'>
                            <div className='truncate text-[13px] font-medium text-[hsl(var(--text-secondary))]'>
                              {workspace.name}
                            </div>
                            {workspace.teamName && (
                              <span className='inline-flex flex-shrink-0 items-center rounded-md bg-[hsl(var(--lazarus-blue))]/10 px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--lazarus-blue))]'>
                                {workspace.teamName}
                              </span>
                            )}
                            {isStarting && (
                              <span className='inline-flex flex-shrink-0 items-center gap-1 rounded-md bg-[hsl(var(--lazarus-blue))]/10 px-1.5 py-0.5 text-[10px] font-medium text-[hsl(var(--lazarus-blue))]'>
                                <Spinner size='sm' />
                                Provisioning
                              </span>
                            )}
                            {isFailed && (
                              <span className='inline-flex flex-shrink-0 items-center rounded-md bg-red-500/10 px-1.5 py-0.5 text-[10px] font-medium text-red-500'>
                                Failed
                              </span>
                            )}
                          </div>
                          <div className='truncate text-[10px] text-[hsl(var(--text-tertiary))]'>
                            {isStarting ? (
                              'Booting workspace VM…'
                            ) : isFailed ? (
                              'Provisioning failed — try again or delete'
                            ) : (
                              <WorkspaceAgentCount
                                workspaceId={workspace.id}
                                fallback={workspace.agentCount || 0}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </m.button>
                  )
                })}

              {/* Add Workspace Button */}
              <m.button
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{
                  delay: 0.05 * (sortedWorkspaces.length - 1),
                  duration: 0.2,
                }}
                onClick={handleAddWorkspace}
                disabled={isCreatingWorkspace}
                className={cn(
                  'w-full rounded-lg px-3 py-2 text-left transition-colors',
                  'border border-dashed border-[hsl(var(--border-dark))]',
                  'hover:border-[hsl(var(--lazarus-blue))] hover:bg-[hsl(var(--lazarus-blue))]/5',
                  isCreatingWorkspace && 'cursor-wait opacity-70',
                )}>
                <div className='flex items-center gap-2'>
                  <div className='flex h-5 w-5 items-center justify-center rounded-sm bg-[hsl(var(--lazarus-blue))]/10'>
                    {isCreatingWorkspace ? (
                      <Spinner size='sm' />
                    ) : (
                      <svg
                        width={12}
                        height={12}
                        viewBox='0 0 16 16'
                        fill='none'
                        className='text-[hsl(var(--lazarus-blue))]'>
                        <path
                          d='M8 3.33334V12.6667M3.33334 8H12.6667'
                          stroke='currentColor'
                          strokeWidth='1.5'
                          strokeLinecap='round'
                          strokeLinejoin='round'
                        />
                      </svg>
                    )}
                  </div>
                  <div className='text-[13px] font-medium text-[hsl(var(--lazarus-blue))]'>
                    {isCreatingWorkspace ? 'Creating...' : 'Add workspace'}
                  </div>
                </div>
              </m.button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}
