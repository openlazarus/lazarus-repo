'use client'

import {
  RiAlertFill,
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCheckFill,
  RiCloseLine,
  RiMailFill,
  RiPauseFill,
  RiPlayFill,
  RiShieldKeyholeFill,
  RiStopFill,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { memo, useState } from 'react'

import { Typography } from '@/components/ui'
import Spinner from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

export interface ExecutingTask {
  id: string
  type: 'agent' | 'task'
  title: string
  description: string
  status: 'executing' | 'paused' | 'awaiting_approval' | 'completed' | 'error'
  workspace?: string
  file?: string
  trigger?: string
  startedAt: Date
  completedAt?: Date
  progress?: number
  // Progress details
  step?: 'thinking' | 'tool_use' | 'responding'
  toolName?: string
  message?: string
  // Email context (for email-triggered agents)
  emailContext?: {
    from: string
    subject: string
    preview?: string
    messageId?: string
  }
  // Activity log link
  logId?: string
  // Agent identifier for matching
  agentId?: string
}

interface ExecutionCardProps {
  task: ExecutingTask
  isDark: boolean
  index: number
  onStop?: (taskId: string) => void
  onPause?: (taskId: string) => void
  onPlay?: (taskId: string) => void
  onDismiss?: (taskId: string) => void
  stopping?: boolean
}

export const ExecutionCard = memo(
  ({
    task,
    isDark,
    index,
    onStop,
    onPause,
    onPlay,
    onDismiss,
    stopping,
  }: ExecutionCardProps) => {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const isAwaitingApproval = task.status === 'awaiting_approval'
    const isPaused = task.status === 'paused' || isAwaitingApproval
    const isCompleted = task.status === 'completed'
    const isError = task.status === 'error'

    const statusLabel: Record<string, string> = {
      completed: 'Completed',
      error: 'Error',
      awaiting_approval: 'Awaiting Approval',
      paused: 'Paused',
    }
    const statusColor: Record<string, string> = {
      completed: '#10B981',
      error: '#EF4444',
      awaiting_approval: '#FE9F0C',
      paused: '#FE9F0C',
    }

    // Calculate elapsed time (or duration if completed)
    const elapsedTime =
      (isCompleted || isError) && task.completedAt
        ? Math.floor(
            (task.completedAt.getTime() - task.startedAt.getTime()) / 1000,
          )
        : Math.floor((Date.now() - task.startedAt.getTime()) / 1000)
    const minutes = Math.floor(elapsedTime / 60)
    const seconds = elapsedTime % 60

    return (
      <m.div
        initial={{
          opacity: 0,
          y: 20,
          filter: 'blur(4px)',
        }}
        animate={{
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
        }}
        transition={{
          duration: 0.6,
          delay: index * 0.08,
          ease: [0.32, 0, 0.67, 0],
        }}
        whileHover={{
          scale: 1.01,
          transition: {
            duration: 0.2,
            ease: [0.25, 0.46, 0.45, 0.94],
          },
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className='group relative cursor-pointer overflow-hidden'>
        {/* Hover background effect */}
        <m.div
          className={cn(
            'absolute inset-0 opacity-0',
            isDark
              ? 'bg-gradient-to-r from-white/[0.02] to-white/[0.04]'
              : 'bg-gradient-to-r from-black/[0.01] to-black/[0.02]',
          )}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
        <div className='relative z-10 px-6 py-5 transition-all duration-200'>
          {/* First Line - Title with status and controls */}
          <div className='mb-2'>
            <div className='flex items-center gap-2'>
              {/* Status Icon */}
              {isCompleted ? (
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className='pt-0.5'>
                  <RiCheckFill size={16} className='text-green-500' />
                </m.div>
              ) : isError ? (
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className='pt-0.5'>
                  <RiAlertFill size={16} className='text-red-500' />
                </m.div>
              ) : isAwaitingApproval ? (
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.1, 1], opacity: 1 }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                  className='pt-0.5'>
                  <RiShieldKeyholeFill size={16} className='text-[#0098FC]' />
                </m.div>
              ) : isPaused ? (
                <m.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.5 }}
                  className='pt-0.5'>
                  <RiPauseFill
                    size={16}
                    className={isDark ? 'text-white/50' : 'text-black/50'}
                  />
                </m.div>
              ) : (
                <div className='pt-0.5'>
                  <Spinner size='sm' />
                </div>
              )}

              {/* Title */}
              <Typography
                variant='body'
                className='flex items-center gap-2 !text-[14px]'>
                {task.emailContext && (
                  <RiMailFill size={16} className='text-[#0098FC]' />
                )}
                {task.title}
              </Typography>

              {/* Status Badge */}
              <m.div
                className='flex items-center gap-1.5'
                animate={{ opacity: isPaused ? 0.7 : 1 }}>
                <m.div
                  className='h-1.5 w-1.5 rounded-full'
                  style={{
                    backgroundColor: statusColor[task.status] || '#0098FC',
                  }}
                  animate={{
                    scale:
                      isCompleted || isError ? 1 : isPaused ? 1 : [1, 1.2, 1],
                    opacity:
                      isCompleted || isError
                        ? 1
                        : isPaused
                          ? 0.7
                          : [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: isCompleted || isError ? 0 : Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <span
                  className='text-[11px] font-medium'
                  style={{
                    color: statusColor[task.status] || '#0098FC',
                  }}>
                  {statusLabel[task.status] || 'Executing'}
                </span>
              </m.div>

              {/* Elapsed Time */}
              <m.span
                initial={{ opacity: 0, x: -10 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  x: isHovered ? 0 : -10,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className={cn(
                  'font-mono text-[11px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                {minutes}:{seconds.toString().padStart(2, '0')}
              </m.span>

              {/* Spacer */}
              <div className='flex-1' />

              {/* Control Buttons - appear on hover */}
              <m.div
                initial={{ opacity: 0, x: 10 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  x: isHovered ? 0 : 10,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className='flex items-center gap-1'
                onClick={(e) => e.stopPropagation()}>
                {/* Pause/Play/Stop - only for running tasks */}
                {!isCompleted && !isError && (
                  <>
                    <m.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (isPaused) {
                          onPlay?.(task.id)
                        } else {
                          onPause?.(task.id)
                        }
                      }}
                      className={cn(
                        'rounded p-1 transition-colors',
                        isDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
                      )}
                      title={isPaused ? 'Play' : 'Pause'}>
                      {isPaused ? (
                        <RiPlayFill
                          size={14}
                          className={isDark ? 'text-white/70' : 'text-black/70'}
                        />
                      ) : (
                        <RiPauseFill
                          size={14}
                          className={isDark ? 'text-white/70' : 'text-black/70'}
                        />
                      )}
                    </m.button>

                    <m.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onStop?.(task.id)}
                      disabled={stopping}
                      className={cn(
                        'rounded p-1 transition-colors',
                        stopping
                          ? 'cursor-not-allowed opacity-50'
                          : isDark
                            ? 'hover:bg-white/10'
                            : 'hover:bg-black/10',
                      )}
                      title={stopping ? 'Stopping...' : 'Stop'}>
                      {stopping ? (
                        <Spinner size='sm' />
                      ) : (
                        <RiStopFill
                          size={14}
                          className={isDark ? 'text-white/70' : 'text-black/70'}
                        />
                      )}
                    </m.button>
                  </>
                )}

                {/* Dismiss Button - only for completed/error tasks */}
                {(isCompleted || isError) && onDismiss && (
                  <m.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onDismiss(task.id)}
                    className={cn(
                      'rounded p-1 transition-colors',
                      isDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
                    )}
                    title='Dismiss'>
                    <RiCloseLine
                      size={14}
                      className={isDark ? 'text-white/70' : 'text-black/70'}
                    />
                  </m.button>
                )}

                {/* Expand/Collapse Button - always visible */}
                <m.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={cn(
                    'rounded p-1 transition-colors',
                    isDark ? 'hover:bg-white/10' : 'hover:bg-black/10',
                  )}
                  title={isExpanded ? 'Collapse' : 'Expand'}>
                  {isExpanded ? (
                    <RiArrowUpSLine
                      size={14}
                      className={isDark ? 'text-white/70' : 'text-black/70'}
                    />
                  ) : (
                    <RiArrowDownSLine
                      size={14}
                      className={isDark ? 'text-white/70' : 'text-black/70'}
                    />
                  )}
                </m.button>
              </m.div>
            </div>

            {/* Description - on a new line below title */}
            <div className='ml-6 mt-1'>
              <span
                className={cn(
                  'text-[14px]',
                  isDark ? 'text-white/50' : 'text-black/50',
                )}>
                {task.description}
              </span>
            </div>

            {/* Error message - show for failed executions */}
            {isError && task.message && (
              <div className='ml-6 mt-1.5 flex items-center gap-1.5'>
                <RiAlertFill size={12} className='text-red-500' />
                <span className='text-[12px] italic text-red-500'>
                  {task.message}
                </span>
              </div>
            )}

            {/* Awaiting approval banner */}
            {isAwaitingApproval && (
              <div
                className={cn(
                  'ml-6 mt-2 flex items-center gap-2 rounded-lg px-3 py-2',
                  isDark ? 'bg-[#FE9F0C]/10' : 'bg-[#FE9F0C]/8',
                )}>
                <RiPauseFill
                  size={14}
                  className='flex-shrink-0 text-[#FE9F0C]'
                />
                <span className='text-[12px] font-medium text-[#FE9F0C]'>
                  {task.toolName
                    ? `Waiting for approval to use ${task.toolName.replace(/^mcp__.*?__/, '')}`
                    : 'Waiting for approval'}
                </span>
              </div>
            )}

            {/* Progress message - show current step */}
            {!isCompleted &&
              !isError &&
              !isAwaitingApproval &&
              task.message && (
                <div className='ml-6 mt-1.5 flex items-center gap-1.5'>
                  <span
                    className={cn(
                      'text-[12px] italic',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    {task.message}
                  </span>
                </div>
              )}
          </div>

          {/* Second Line - Details */}
          <div className='flex items-center justify-between'>
            {/* Left: Empty space to maintain layout */}
            <div className='flex items-center gap-2'></div>

            {/* Right: Progress */}
            {task.progress !== undefined && (
              <div className='flex items-center gap-2'>
                <div
                  className={cn(
                    'h-1 w-16 overflow-hidden rounded-full',
                    isDark ? 'bg-white/5' : 'bg-black/5',
                  )}>
                  <m.div
                    className='h-full bg-[#0098FC]'
                    initial={{ width: 0 }}
                    animate={{ width: `${task.progress}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>
                <span
                  className={cn(
                    'font-mono text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  {task.progress}%
                </span>
              </div>
            )}
          </div>

          {/* Expanded Details */}
          <m.div
            initial={false}
            animate={{
              height: isExpanded ? 'auto' : 0,
              opacity: isExpanded ? 1 : 0,
            }}
            transition={{ duration: 0.3, ease: [0.32, 0, 0.67, 0] }}
            className='overflow-hidden'>
            {isExpanded && (
              <div
                className='mt-3 space-y-2 border-t pt-3'
                style={{
                  borderColor: isDark
                    ? 'rgba(255,255,255,0.05)'
                    : 'rgba(0,0,0,0.05)',
                }}>
                {task.file && (
                  <div>
                    <span
                      className={cn(
                        'mb-1 block text-[10px] font-semibold uppercase tracking-wider',
                        isDark ? 'text-white/40' : 'text-black/40',
                      )}>
                      File
                    </span>
                    <span
                      className={cn(
                        'font-mono text-[13px]',
                        isDark ? 'text-white/60' : 'text-black/60',
                      )}>
                      {task.file}
                    </span>
                  </div>
                )}
                {task.trigger && (
                  <div>
                    <span
                      className={cn(
                        'mb-1 block text-[10px] font-semibold uppercase tracking-wider',
                        isDark ? 'text-white/40' : 'text-black/40',
                      )}>
                      Trigger
                    </span>
                    <span
                      className={cn(
                        'text-[13px]',
                        isDark ? 'text-white/60' : 'text-black/60',
                      )}>
                      {task.trigger}
                    </span>
                  </div>
                )}
                {task.emailContext && (
                  <div>
                    <span
                      className={cn(
                        'mb-1 block text-[10px] font-semibold uppercase tracking-wider',
                        isDark ? 'text-white/40' : 'text-black/40',
                      )}>
                      Email
                    </span>
                    <div className='space-y-1'>
                      <div>
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            isDark ? 'text-white/40' : 'text-black/40',
                          )}>
                          From:{' '}
                        </span>
                        <span
                          className={cn(
                            'text-[13px]',
                            isDark ? 'text-white/60' : 'text-black/60',
                          )}>
                          {task.emailContext.from}
                        </span>
                      </div>
                      <div>
                        <span
                          className={cn(
                            'text-[11px] font-medium',
                            isDark ? 'text-white/40' : 'text-black/40',
                          )}>
                          Subject:{' '}
                        </span>
                        <span
                          className={cn(
                            'text-[13px]',
                            isDark ? 'text-white/60' : 'text-black/60',
                          )}>
                          {task.emailContext.subject}
                        </span>
                      </div>
                      {task.emailContext.preview && (
                        <div>
                          <span
                            className={cn(
                              'text-[11px] font-medium',
                              isDark ? 'text-white/40' : 'text-black/40',
                            )}>
                            Preview:{' '}
                          </span>
                          <span
                            className={cn(
                              'text-[13px]',
                              isDark ? 'text-white/50' : 'text-black/50',
                            )}>
                            {task.emailContext.preview}...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </m.div>
        </div>
      </m.div>
    )
  },
)

ExecutionCard.displayName = 'ExecutionCard'
