'use client'

import { RiFolder3Line, RiGlobalLine, RiRobot2Line } from '@remixicon/react'

import { useMemoryScopeCounts } from '@/hooks/features/knowledge/use-knowledge-graph'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

export type MemoryScopeSelection =
  | { kind: 'workspace' }
  | { kind: 'agent'; agentId: string; agentName: string }
  | { kind: 'all' }

export function isSameScope(
  a: MemoryScopeSelection,
  b: MemoryScopeSelection,
): boolean {
  if (a.kind !== b.kind) return false
  if (a.kind === 'agent' && b.kind === 'agent') return a.agentId === b.agentId
  return true
}

interface MemoryScopeNavigatorProps {
  workspaceId: string
  selected: MemoryScopeSelection
  onSelect: (scope: MemoryScopeSelection) => void
}

export function MemoryScopeNavigator({
  workspaceId,
  selected,
  onSelect,
}: MemoryScopeNavigatorProps) {
  const { isDark } = useTheme()
  const { counts, loading } = useMemoryScopeCounts({ workspaceId })

  const workspaceActive = selected.kind === 'workspace'
  const allActive = selected.kind === 'all'

  const itemClass = (active: boolean) =>
    cn(
      'flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors',
      active
        ? isDark
          ? 'bg-white/[0.08] text-white'
          : 'bg-black/[0.06] text-black'
        : isDark
          ? 'text-white/70 hover:bg-white/[0.04]'
          : 'text-black/70 hover:bg-black/[0.03]',
    )

  const sectionLabel = cn(
    'px-2.5 pb-1 pt-3 text-[10px] uppercase tracking-wider',
    isDark ? 'text-white/30' : 'text-black/30',
  )

  const countBadge = cn(
    'tabular-nums text-[11px]',
    isDark ? 'text-white/40' : 'text-black/40',
  )

  return (
    <aside
      className={cn(
        'w-56 shrink-0 overflow-y-auto border-r',
        isDark
          ? 'border-white/[0.06] bg-[#1a1a1a]'
          : 'border-black/[0.06] bg-white',
      )}>
      <div className='py-2'>
        <div className={sectionLabel}>Scopes</div>

        <button
          type='button'
          onClick={() => onSelect({ kind: 'workspace' })}
          className={itemClass(workspaceActive)}>
          <span className='flex items-center gap-2'>
            <RiFolder3Line className='h-3.5 w-3.5 opacity-60' />
            Workspace
          </span>
          <span className={countBadge}>
            {loading ? '…' : (counts?.workspace ?? 0)}
          </span>
        </button>

        <div className={sectionLabel}>Agents</div>

        {loading && !counts && (
          <div
            className={cn(
              'px-2.5 py-1 text-[11px]',
              isDark ? 'text-white/30' : 'text-black/30',
            )}>
            Loading…
          </div>
        )}

        {counts && counts.agents.length === 0 && (
          <div
            className={cn(
              'px-2.5 py-1 text-[11px]',
              isDark ? 'text-white/30' : 'text-black/30',
            )}>
            No agents
          </div>
        )}

        {counts?.agents.map((agent) => {
          const active =
            selected.kind === 'agent' && selected.agentId === agent.agentId
          return (
            <button
              key={agent.agentId}
              type='button'
              onClick={() =>
                onSelect({
                  kind: 'agent',
                  agentId: agent.agentId,
                  agentName: agent.agentName,
                })
              }
              className={itemClass(active)}>
              <span className='flex items-center gap-2 truncate'>
                <RiRobot2Line className='h-3.5 w-3.5 shrink-0 opacity-60' />
                <span className='truncate'>{agent.agentName}</span>
              </span>
              <span className={countBadge}>{agent.count}</span>
            </button>
          )
        })}

        <div className={sectionLabel}>Aggregated</div>

        <button
          type='button'
          onClick={() => onSelect({ kind: 'all' })}
          className={itemClass(allActive)}>
          <span className='flex items-center gap-2'>
            <RiGlobalLine className='h-3.5 w-3.5 opacity-60' />
            All memories
          </span>
          <span className={countBadge}>
            {counts
              ? counts.workspace +
                counts.agents.reduce((s, a) => s + a.count, 0)
              : '—'}
          </span>
        </button>
      </div>
    </aside>
  )
}
