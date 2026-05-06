'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

import { WorkspaceAgentCount } from '@/components/features/agents/workspace-agent-count'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { cn } from '@/lib/utils'
import { useWorkspaceStore, Workspace } from '@/store/workspace-store'

function WorkspaceIcon({
  workspace,
  size = 'sm',
}: {
  workspace: Workspace | undefined
  size?: 'sm' | 'xs'
}) {
  const sizeClasses = size === 'sm' ? 'h-6 w-6' : 'h-5 w-5'
  const textSize = size === 'sm' ? 'text-[10px]' : 'text-[9px]'

  if (workspace?.avatar) {
    return (
      <div
        className={cn(
          sizeClasses,
          'flex-shrink-0 overflow-hidden rounded-full bg-black/5 dark:bg-white/10',
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
        'flex flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-black/5 dark:bg-white/10',
      )}>
      <span
        className={cn(
          textSize,
          'font-semibold text-black/40 dark:text-white/60',
        )}>
        {workspace?.name?.charAt(0).toUpperCase() || 'W'}
      </span>
    </div>
  )
}

export function MobileWorkspaceSelector() {
  const { workspaces, isLoading, selectWorkspace } = useWorkspace()
  const activeWorkspaceId = useWorkspaceStore(
    (state) => state.activeWorkspaceId,
  )
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const currentWorkspace = useMemo(
    () => workspaces.find((ws) => ws.id === activeWorkspaceId),
    [workspaces, activeWorkspaceId],
  )

  const { groupedWorkspaces, personalWorkspaces } = useMemo(() => {
    const grouped: Record<
      string,
      { teamName: string; workspaces: Workspace[] }
    > = {}
    const personal: Workspace[] = []

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

    Object.values(grouped).forEach((group) => {
      group.workspaces.sort((a, b) => a.name.localeCompare(b.name))
    })
    personal.sort((a, b) => a.name.localeCompare(b.name))

    return { groupedWorkspaces: grouped, personalWorkspaces: personal }
  }, [workspaces])

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return

    const handleClick = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [isOpen])

  const handleSelect = (workspaceId: string) => {
    selectWorkspace(workspaceId)
    setIsOpen(false)
  }

  if (isLoading) {
    return (
      <div className='flex items-center gap-1.5 px-2 py-1.5'>
        <div className='h-5 w-5 animate-pulse rounded-full bg-[hsl(var(--border))]' />
        <div className='h-3 w-16 animate-pulse rounded bg-[hsl(var(--border))]' />
      </div>
    )
  }

  if (workspaces.length === 0) return null

  return (
    <div ref={dropdownRef} className='relative'>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
          'text-[hsl(var(--text-secondary))] hover:bg-[hsl(var(--border))]',
          isOpen && 'bg-[hsl(var(--border))]',
        )}>
        <WorkspaceIcon workspace={currentWorkspace} size='xs' />
        <span className='max-w-[100px] truncate text-[13px]'>
          {currentWorkspace?.name || 'Workspace'}
        </span>
        <svg
          width={12}
          height={12}
          viewBox='0 0 16 16'
          fill='none'
          className={cn(
            'flex-shrink-0 transition-transform',
            isOpen && 'rotate-180',
          )}>
          <path
            d='M4 6L8 10L12 6'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      </button>

      {isOpen && (
        <div className='absolute right-0 top-full z-[100] mt-1 w-64 rounded-lg border border-[hsl(var(--border))] bg-background shadow-lg dark:bg-background-secondary'>
          <div className='max-h-[300px] overflow-y-auto p-1.5'>
            {/* Personal workspaces */}
            {personalWorkspaces.length > 0 && (
              <div>
                <div className='px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-tertiary))]'>
                  Personal
                </div>
                {personalWorkspaces.map((ws) => (
                  <WorkspaceItem
                    key={ws.id}
                    workspace={ws}
                    isActive={ws.id === activeWorkspaceId}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}

            {/* Team workspaces */}
            {Object.entries(groupedWorkspaces)
              .sort(([, a], [, b]) => a.teamName.localeCompare(b.teamName))
              .map(([teamId, group]) => (
                <div key={teamId}>
                  <div className='mt-1 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--text-tertiary))]'>
                    {group.teamName}
                  </div>
                  {group.workspaces.map((ws) => (
                    <WorkspaceItem
                      key={ws.id}
                      workspace={ws}
                      isActive={ws.id === activeWorkspaceId}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function WorkspaceItem({
  workspace,
  isActive,
  onSelect,
}: {
  workspace: Workspace
  isActive: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      onClick={() => onSelect(workspace.id)}
      className={cn(
        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors',
        isActive
          ? 'bg-[hsl(var(--lazarus-blue))]/10 text-[hsl(var(--lazarus-blue))]'
          : 'hover:bg-[hsl(var(--border))]',
      )}>
      <WorkspaceIcon workspace={workspace} size='sm' />
      <div className='min-w-0 flex-1'>
        <div className='truncate text-[13px] font-medium'>{workspace.name}</div>
        <div className='truncate text-[10px] text-[hsl(var(--text-tertiary))]'>
          <WorkspaceAgentCount
            workspaceId={workspace.id}
            fallback={workspace.agentCount || 0}
          />
        </div>
      </div>
      {isActive && (
        <svg
          width={14}
          height={14}
          viewBox='0 0 16 16'
          fill='none'
          className='flex-shrink-0'>
          <path
            d='M3 8L6.5 11.5L13 4.5'
            stroke='currentColor'
            strokeWidth='1.5'
            strokeLinecap='round'
            strokeLinejoin='round'
          />
        </svg>
      )}
    </button>
  )
}
