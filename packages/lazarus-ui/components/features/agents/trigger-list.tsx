'use client'

import {
  RiAddLine,
  RiDeleteBinLine,
  RiPencilLine,
  RiPlayLine,
  RiStopFill,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useEffect, useState } from 'react'

import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import Spinner from '@/components/ui/spinner'
import { useWorkspace } from '@/hooks/core/use-workspace'
import { useDeleteTrigger } from '@/hooks/features/agents/use-delete-trigger'
import { useStopExecution } from '@/hooks/features/agents/use-execution-control'
import { useGetTriggers } from '@/hooks/features/agents/use-get-triggers'
import { useRunTrigger } from '@/hooks/features/agents/use-run-trigger'
import { useTheme } from '@/hooks/ui/use-theme'
import { useAgentStatus } from '@/hooks/use-agent-status'
import { cn } from '@/lib/utils'

// ── Custom icons ─────────────────────────────────────────────

function ScheduleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <circle cx='12' cy='12' r='10' />
      <path d='M12 6v6l4 2' />
    </svg>
  )
}

function SignalIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <polygon points='13 2 3 14 12 14 11 22 21 10 12 10 13 2' />
    </svg>
  )
}

function MessageBubbleIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      viewBox='0 0 24 24'
      fill='none'
      stroke='currentColor'
      strokeWidth='2'
      strokeLinecap='round'
      strokeLinejoin='round'
      className={className}>
      <path d='M7.9 20A9 9 0 1 0 4 16.1L2 22z' />
    </svg>
  )
}

function getTriggerIcon(type: string) {
  switch (type) {
    case 'scheduled':
      return ScheduleIcon
    case 'webhook':
      return SignalIcon
    case 'whatsapp':
      return MessageBubbleIcon
    default:
      return ScheduleIcon
  }
}

export interface Trigger {
  id: string
  name?: string
  type: 'scheduled' | 'email' | 'webhook' | 'external' | 'whatsapp'
  agentId: string
  workspaceId: string
  enabled: boolean
  config: any
  createdAt: string
}

interface TriggerListProps {
  agentId: string
  onCreateTrigger?: () => void
  onEditTrigger?: (trigger: Trigger) => void
  onTriggerDeleted?: () => void
}

// ── Cron → visual helpers ─────────────────────────────────────

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function getActiveDays(trigger: Trigger): boolean[] | null {
  if (trigger.type !== 'scheduled') return null
  const expr = trigger.config?.schedule?.expression
  if (!expr || expr === '*/30 * * * *' || expr === '0 * * * *') return null
  const p = expr.split(' ')
  if (p.length !== 5) return null
  const [, , dom, , dow] = p
  if (dom !== '*') return null
  if (dow === '*') return [true, true, true, true, true, true, true]
  if (dow === '1-5') return [true, true, true, true, true, false, false]
  const result = [false, false, false, false, false, false, false]
  dow
    .split(',')
    .map(Number)
    .forEach((d: number) => {
      const idx = d === 0 ? 6 : d - 1
      if (idx >= 0 && idx < 7) result[idx] = true
    })
  return result
}

function getScheduleTime(trigger: Trigger): string | null {
  if (trigger.type !== 'scheduled') return null
  const expr = trigger.config?.schedule?.expression
  if (!expr || expr === '*/30 * * * *' || expr === '0 * * * *') return null
  const p = expr.split(' ')
  if (p.length !== 5 || p[1] === '*') return null
  const h = parseInt(p[1])
  const m = p[0].padStart(2, '0')
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${m} ${h >= 12 ? 'PM' : 'AM'}`
}

function getFrequencyLabel(trigger: Trigger): string {
  if (trigger.type === 'webhook') return 'On signal'
  if (trigger.type === 'email') return 'On email'
  if (trigger.type === 'whatsapp') return 'On message'
  const expr = trigger.config?.schedule?.expression
  if (trigger.config?.schedule?.type === 'once') return 'One-time'
  if (expr === '*/30 * * * *') return 'Every 30 min'
  if (expr === '0 * * * *') return 'Hourly'
  const p = expr?.split(' ')
  if (p?.length === 5 && p[2] !== '*') {
    const d = p[2]
    const s = [1, 21, 31].includes(+d)
      ? 'st'
      : [2, 22].includes(+d)
        ? 'nd'
        : [3, 23].includes(+d)
          ? 'rd'
          : 'th'
    return d === 'L' ? 'Last of month' : `Monthly, ${d}${s}`
  }
  return trigger.name || 'Scheduled'
}

// ── Component ─────────────────────────────────────────────────

export function TriggerList({
  agentId,
  onCreateTrigger,
  onEditTrigger,
  onTriggerDeleted,
}: TriggerListProps) {
  const { isDark } = useTheme()
  const { selectedWorkspace } = useWorkspace()
  const workspaceId = selectedWorkspace?.id
  const [triggers, setTriggers] = useState<Trigger[]>([])
  const {
    data: triggersData,
    loading,
    mutate: refetchTriggers,
  } = useGetTriggers(workspaceId ?? '', agentId ?? '')
  const { tasks } = useAgentStatus(workspaceId)
  const activeTask = tasks.find(
    (t) => t.agentId === agentId && t.status === 'executing',
  )
  const isAgentExecuting = !!activeTask
  const [stopExecution, { loading: stopping }] = useStopExecution(
    activeTask?.id || '',
  )
  const [deletingTrigger, setDeletingTrigger] = useState<Trigger | null>(null)
  const [runningTriggerId, setRunningTriggerId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [runTriggerCall] = useRunTrigger(
    workspaceId ?? '',
    agentId ?? '',
    runningTriggerId ?? '',
  )

  useEffect(() => {
    if (!runningTriggerId) return
    runTriggerCall(undefined as never)
      .catch((err) => console.error('Failed to run trigger:', err))
      .finally(() => setRunningTriggerId(null))
  }, [runningTriggerId, runTriggerCall])

  useEffect(() => {
    setTriggers((triggersData?.triggers || []) as unknown as Trigger[])
  }, [triggersData])

  const [deleteTriggerCall] = useDeleteTrigger(
    workspaceId ?? '',
    agentId ?? '',
    deletingTrigger?.id ?? '',
  )

  const getTriggerTypeLabel = (type: string) => {
    switch (type) {
      case 'scheduled':
        return 'Timer'
      case 'email':
        return 'Email'
      case 'webhook':
        return 'App Signal'
      case 'whatsapp':
        return 'WhatsApp'
      default:
        return 'Trigger'
    }
  }

  const handleDeleteTrigger = async () => {
    if (!deletingTrigger || !workspaceId) return
    setIsDeleting(true)
    try {
      await deleteTriggerCall(undefined as never)
      await refetchTriggers()
      onTriggerDeleted?.()
    } catch (error) {
      console.error('Failed to delete trigger:', error)
    } finally {
      setIsDeleting(false)
      setDeletingTrigger(null)
    }
  }

  const handleRunTrigger = (trigger: Trigger) => {
    if (!workspaceId || isAgentExecuting) return
    setRunningTriggerId(trigger.id)
  }

  if (loading) {
    return (
      <div>
        <h2 className='text-[14px] font-semibold'>Schedule</h2>
        <div className='py-6'>
          <Spinner size='sm' />
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className='flex items-center justify-between'>
        <h2 className='text-[14px] font-semibold'>Schedule</h2>
        {onCreateTrigger && triggers.length > 0 && (
          <button
            onClick={onCreateTrigger}
            className={cn(
              'flex items-center rounded-full p-1.5 transition-all',
              isDark
                ? 'text-white/40 hover:bg-white/5 hover:text-white/70'
                : 'text-black/40 hover:bg-black/5 hover:text-black/70',
            )}>
            <RiAddLine className='h-4 w-4' />
          </button>
        )}
      </div>

      {triggers.length === 0 ? (
        <m.div
          className='mt-3'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}>
          {onCreateTrigger ? (
            <button
              onClick={onCreateTrigger}
              className={cn(
                'flex items-center gap-1.5 text-[13px] transition-colors',
                isDark
                  ? 'text-white/30 hover:text-white/50'
                  : 'text-black/30 hover:text-black/50',
              )}>
              <RiAddLine className='h-3 w-3' />
              New automation
            </button>
          ) : (
            <p
              className={cn(
                'text-[13px]',
                isDark ? 'text-white/30' : 'text-black/30',
              )}>
              No automations
            </p>
          )}
        </m.div>
      ) : (
        <m.div
          className='mt-3'
          initial='hidden'
          animate='visible'
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.04, delayChildren: 0.1 },
            },
          }}>
          {triggers.map((trigger, index) => {
            const activeDays = getActiveDays(trigger)
            const time = getScheduleTime(trigger)
            const hasTask = !!trigger.config?.task
            const TriggerIcon = getTriggerIcon(trigger.type)
            const isRunning = isAgentExecuting

            return (
              <m.div
                key={trigger.id}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: {
                      duration: 0.3,
                      ease: [0.22, 1, 0.36, 1],
                    },
                  },
                }}
                whileHover={{
                  backgroundColor: isDark
                    ? 'rgba(255,255,255,0.015)'
                    : 'rgba(0,0,0,0.01)',
                  x: 2,
                  transition: { duration: 0.15 },
                }}
                onClick={() => onEditTrigger?.(trigger)}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 border-b py-3',
                  isDark ? 'border-white/[0.04]' : 'border-black/[0.04]',
                  index === 0 &&
                    (isDark
                      ? 'border-t border-t-white/[0.04]'
                      : 'border-t border-t-black/[0.04]'),
                  !trigger.enabled && 'opacity-40',
                )}>
                {/* Trigger type icon */}
                <div
                  className={cn(
                    'flex-shrink-0',
                    isDark ? 'text-white/25' : 'text-black/25',
                  )}>
                  <TriggerIcon className='h-4 w-4' />
                </div>

                {/* Left: task or trigger name */}
                <p
                  className={cn(
                    'min-w-0 flex-1 truncate text-[13px] font-medium',
                    isDark ? 'text-foreground' : 'text-[#1a1a1a]',
                  )}>
                  {hasTask
                    ? trigger.config.task
                    : trigger.name || getTriggerTypeLabel(trigger.type)}
                </p>

                {/* Right: visual schedule fingerprint */}
                <div className='flex flex-shrink-0 items-center gap-3'>
                  {activeDays ? (
                    <div className='flex gap-[3px]'>
                      {DAY_LABELS.map((label, i) => (
                        <div
                          key={i}
                          className={cn(
                            'flex h-3.5 w-3.5 items-center justify-center rounded-full text-[7px] font-bold leading-none',
                            activeDays[i]
                              ? 'bg-[#0098FC] text-white'
                              : isDark
                                ? 'bg-white/[0.04] text-white/15'
                                : 'bg-black/[0.04] text-black/15',
                          )}>
                          {label}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span
                      className={cn(
                        'text-[11px]',
                        isDark ? 'text-white/30' : 'text-black/30',
                      )}>
                      {getFrequencyLabel(trigger)}
                    </span>
                  )}

                  {time && (
                    <span
                      className={cn(
                        'w-[58px] text-right text-[11px] tabular-nums',
                        isDark ? 'text-white/25' : 'text-black/25',
                      )}>
                      {time}
                    </span>
                  )}
                </div>

                {/* Actions — fixed-width to prevent layout shift */}
                <div className='flex w-[72px] flex-shrink-0 items-center justify-end gap-px opacity-0 transition-opacity group-hover:opacity-100'>
                  {isRunning ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        stopExecution()
                      }}
                      disabled={stopping}
                      className={cn(
                        'rounded-full p-1.5 transition-colors',
                        stopping
                          ? 'cursor-not-allowed opacity-50'
                          : isDark
                            ? 'text-red-400/60 hover:bg-red-500/10 hover:text-red-400'
                            : 'text-red-500/50 hover:bg-red-500/5 hover:text-red-500',
                      )}
                      title={stopping ? 'Stopping...' : 'Stop execution'}>
                      {stopping ? (
                        <Spinner size='sm' />
                      ) : (
                        <RiStopFill className='h-3 w-3' />
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRunTrigger(trigger)
                      }}
                      className={cn(
                        'rounded-full p-1.5 transition-colors',
                        isDark
                          ? 'text-[#0098FC]/60 hover:bg-[#0098FC]/10 hover:text-[#0098FC]'
                          : 'text-[#0098FC]/50 hover:bg-[#0098FC]/5 hover:text-[#0098FC]',
                      )}
                      title='Run now'>
                      <RiPlayLine className='h-3 w-3' />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditTrigger?.(trigger)
                    }}
                    className={cn(
                      'rounded-full p-1.5 transition-colors',
                      isDark
                        ? 'text-white/40 hover:bg-white/10'
                        : 'text-black/40 hover:bg-black/5',
                    )}>
                    <RiPencilLine className='h-3 w-3' />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeletingTrigger(trigger)
                    }}
                    className={cn(
                      'rounded-full p-1.5 transition-colors',
                      isDark
                        ? 'text-red-400/50 hover:bg-red-500/10 hover:text-red-400'
                        : 'text-red-500/50 hover:bg-red-500/5 hover:text-red-500',
                    )}>
                    <RiDeleteBinLine className='h-3 w-3' />
                  </button>
                </div>
              </m.div>
            )
          })}
        </m.div>
      )}

      {deletingTrigger && (
        <ConfirmDialog
          isDark={isDark}
          title='Delete trigger'
          message='Are you sure? This trigger will stop running automatically.'
          confirmText='Delete'
          onConfirm={handleDeleteTrigger}
          onCancel={() => setDeletingTrigger(null)}
          isLoading={isDeleting}
          variant='danger'
        />
      )}
    </div>
  )
}
