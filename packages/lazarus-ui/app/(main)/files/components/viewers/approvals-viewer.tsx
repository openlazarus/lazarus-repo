'use client'

import {
  RiArrowDownSLine,
  RiArrowRightSLine,
  RiCheckLine,
  RiCloseLine,
  RiRobotLine,
  RiShieldLine,
  RiTimeLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useState } from 'react'

import {
  ActivityTraceEntry,
  PendingApproval,
  useApprovals,
} from '@/hooks/core/use-approvals'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

const smoothEaseOut = [0.22, 1, 0.36, 1] as const

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
}

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: smoothEaseOut },
  },
}

const riskColors: Record<
  string,
  { bg: string; text: string; border: string; badge: string }
> = {
  low: {
    bg: 'bg-[hsl(var(--lazarus-blue)/0.06)]',
    text: 'text-[hsl(var(--lazarus-blue))]',
    border: 'border-[hsl(var(--lazarus-blue)/0.15)]',
    badge: 'bg-[hsl(var(--lazarus-blue)/0.12)] text-[hsl(var(--lazarus-blue))]',
  },
  medium: {
    bg: 'bg-amber-500/5',
    text: 'text-amber-500',
    border: 'border-amber-500/15',
    badge: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
  },
  high: {
    bg: 'bg-orange-500/5',
    text: 'text-orange-500',
    border: 'border-orange-500/15',
    badge: 'bg-orange-500/12 text-orange-600 dark:text-orange-400',
  },
  critical: {
    bg: 'bg-red-500/5',
    text: 'text-red-500',
    border: 'border-red-500/15',
    badge: 'bg-red-500/12 text-red-600 dark:text-red-400',
  },
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function formatToolName(toolName: string): string {
  // Strip MCP prefix (e.g. "mcp__email-tools__email_send" → "email_send")
  const parts = toolName.split('__')
  const name = parts[parts.length - 1] || toolName
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

interface ApprovalCardProps {
  approval: PendingApproval
  onResolve: (id: string, approved: boolean) => void
  isResolving: boolean
}

function ApprovalCard({ approval, onResolve, isResolving }: ApprovalCardProps) {
  const [expanded, setExpanded] = useState(false)
  const { isDark } = useTheme()
  const colors = riskColors[approval.risk_level] || riskColors.medium

  return (
    <m.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: smoothEaseOut }}
      className={cn(
        'rounded-xl border p-4',
        'bg-[hsl(var(--background))]',
        'border-[hsl(var(--border)/0.6)]',
        'transition-all duration-200',
        'hover:border-[hsl(var(--border))]',
      )}>
      {/* Header */}
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <div
            className={cn(
              'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg',
              colors.bg,
            )}>
            <RiShieldLine className={cn('h-4 w-4', colors.text)} />
          </div>
          <div className='min-w-0'>
            <div className='flex items-center gap-2'>
              <span className='truncate text-sm font-medium text-[hsl(var(--text-primary))]'>
                {formatToolName(approval.tool_name)}
              </span>
              <span
                className={cn(
                  'rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                  colors.badge,
                )}>
                {approval.risk_level}
              </span>
            </div>
            <div className='mt-0.5 flex items-center gap-1.5'>
              <RiRobotLine className='h-3 w-3 text-[hsl(var(--text-tertiary))]' />
              <span className='text-xs text-[hsl(var(--text-secondary))]'>
                {approval.agent_name}
              </span>
              <span className='text-[hsl(var(--text-tertiary))]'>·</span>
              <RiTimeLine className='h-3 w-3 text-[hsl(var(--text-tertiary))]' />
              <span className='text-xs text-[hsl(var(--text-tertiary))]'>
                {getRelativeTime(approval.created_at)}
              </span>
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className='flex flex-shrink-0 items-center gap-1.5'>
          <button
            onClick={() => onResolve(approval.id, false)}
            disabled={isResolving}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium',
              'border border-[hsl(var(--border))]',
              'text-[hsl(var(--text-secondary))]',
              'hover:bg-[hsl(var(--background-secondary))]',
              'transition-colors duration-150',
              'disabled:opacity-50',
            )}>
            <RiCloseLine className='h-3.5 w-3.5' />
            Deny
          </button>
          <button
            onClick={() => onResolve(approval.id, true)}
            disabled={isResolving}
            className={cn(
              'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium',
              'bg-[hsl(var(--lazarus-blue))] text-white',
              'hover:opacity-90',
              'transition-opacity duration-150',
              'disabled:opacity-50',
            )}>
            <RiCheckLine className='h-3.5 w-3.5' />
            Approve
          </button>
        </div>
      </div>

      {/* Description */}
      <p className='mt-2.5 text-xs leading-relaxed text-[hsl(var(--text-secondary))]'>
        {approval.description}
      </p>

      {/* Tool parameters preview */}
      {approval.tool_input && Object.keys(approval.tool_input).length > 0 && (
        <div className='mt-2.5'>
          <div
            className={cn(
              'rounded-lg p-2.5 font-mono text-[11px]',
              'bg-[hsl(var(--background-secondary)/0.5)]',
              'text-[hsl(var(--text-secondary))]',
              'max-h-24 overflow-y-auto',
            )}>
            {Object.entries(approval.tool_input).map(([key, value]) => (
              <div key={key} className='flex gap-1.5'>
                <span className='flex-shrink-0 text-[hsl(var(--text-tertiary))]'>
                  {key}:
                </span>
                <span className='truncate'>
                  {typeof value === 'string'
                    ? value.length > 120
                      ? value.slice(0, 120) + '...'
                      : value
                    : JSON.stringify(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activity trace toggle */}
      {approval.activity_trace && approval.activity_trace.length > 0 && (
        <div className='mt-3'>
          <button
            onClick={() => setExpanded(!expanded)}
            className={cn(
              'flex items-center gap-1 text-xs font-medium',
              'text-[hsl(var(--text-secondary))]',
              'hover:text-[hsl(var(--text-primary))]',
              'transition-colors duration-150',
            )}>
            {expanded ? (
              <RiArrowDownSLine className='h-3.5 w-3.5' />
            ) : (
              <RiArrowRightSLine className='h-3.5 w-3.5' />
            )}
            Activity trace ({approval.activity_trace.length} steps)
          </button>

          {expanded && (
            <m.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={cn(
                'mt-2 overflow-hidden rounded-lg border',
                'border-[hsl(var(--border)/0.5)]',
              )}>
              <div className='max-h-64 space-y-1.5 overflow-y-auto p-2.5'>
                {approval.activity_trace.map(
                  (entry: ActivityTraceEntry, i: number) => (
                    <TraceEntry key={i} entry={entry} />
                  ),
                )}
              </div>
            </m.div>
          )}
        </div>
      )}
    </m.div>
  )
}

function TraceEntry({ entry }: { entry: ActivityTraceEntry }) {
  const typeColors: Record<string, string> = {
    assistant: 'text-[hsl(var(--lazarus-blue))]',
    result: 'text-emerald-500',
    user: 'text-[hsl(var(--text-primary))]',
  }

  const typeLabels: Record<string, string> = {
    assistant: 'Agent',
    result: 'Tool result',
    user: 'Prompt',
  }

  const label = typeLabels[entry.type] || entry.type
  const color = typeColors[entry.type] || 'text-[hsl(var(--text-secondary))]'

  let preview = ''
  if (entry.toolName) {
    preview = `Used ${formatToolName(entry.toolName)}`
  } else if (entry.content) {
    if (typeof entry.content === 'string') {
      preview = entry.content.slice(0, 200)
    } else if (Array.isArray(entry.content)) {
      const textBlock = entry.content.find(
        (b: any) => b.type === 'text' && b.text,
      )
      if (textBlock) {
        preview = (textBlock as any).text.slice(0, 200)
      }
    }
  }

  return (
    <div className='flex gap-2 text-[11px] leading-relaxed'>
      <span className={cn('min-w-[70px] flex-shrink-0 font-medium', color)}>
        {label}
      </span>
      <span className='truncate text-[hsl(var(--text-secondary))]'>
        {preview || '(no content)'}
      </span>
    </div>
  )
}

interface ApprovalsViewerProps {
  workspaceId?: string
}

export function ApprovalsViewer({
  workspaceId: workspaceIdProp,
}: ApprovalsViewerProps) {
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = workspaceIdProp || selectedWorkspace?.id
  const { approvals, pendingCount, isLoading, resolveApproval } = useApprovals()
  const [resolvingId, setResolvingId] = useState<string | null>(null)

  const handleResolve = useCallback(
    async (approvalId: string, approved: boolean) => {
      setResolvingId(approvalId)
      try {
        await resolveApproval(approvalId, approved)
      } finally {
        setResolvingId(null)
      }
    },
    [resolveApproval],
  )

  if (isLoading) {
    return (
      <div className='flex h-48 items-center justify-center'>
        <div className='h-5 w-5 animate-spin rounded-full border-2 border-[hsl(var(--lazarus-blue))] border-t-transparent' />
      </div>
    )
  }

  return (
    <div className='h-full overflow-y-auto px-4 py-5'>
      {/* Header */}
      <m.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: smoothEaseOut }}
        className='mb-5'>
        <h2 className='text-lg font-semibold text-[hsl(var(--text-primary))]'>
          Requested approvals
        </h2>
        <p className='mt-1 text-xs text-[hsl(var(--text-secondary))]'>
          Background agents waiting for your permission to continue
        </p>
      </m.div>

      {/* Empty state */}
      {approvals.length === 0 ? (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={cn(
            'flex flex-col items-center justify-center py-16',
            'text-center',
          )}>
          <div
            className={cn(
              'mb-3 flex h-12 w-12 items-center justify-center rounded-xl',
              'bg-[hsl(var(--background-secondary))]',
            )}>
            <RiShieldLine className='h-6 w-6 text-[hsl(var(--text-tertiary))]' />
          </div>
          <p className='text-sm text-[hsl(var(--text-secondary))]'>
            No pending approvals
          </p>
          <p className='mt-1 text-xs text-[hsl(var(--text-tertiary))]'>
            When agents need permission, their requests will appear here
          </p>
        </m.div>
      ) : (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className='space-y-3'>
          {approvals.map((approval) => (
            <ApprovalCard
              key={approval.id}
              approval={approval}
              onResolve={handleResolve}
              isResolving={resolvingId === approval.id}
            />
          ))}
        </m.div>
      )}
    </div>
  )
}
