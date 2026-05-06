'use client'

import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { memo, useState } from 'react'

import { Typography } from '@/components/ui'
import Spinner from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import { ExecutingTask, ExecutionCard } from './execution-card'

interface GlobalExecutionIndicatorProps {
  tasks: ExecutingTask[]
  isDark: boolean
  onStop?: (taskId: string) => void
  onPause?: (taskId: string) => void
  onPlay?: (taskId: string) => void
  onDismiss?: (taskId: string) => void
}

export const GlobalExecutionIndicator = memo(
  ({
    tasks,
    isDark,
    onStop,
    onPause,
    onPlay,
    onDismiss,
  }: GlobalExecutionIndicatorProps) => {
    const [isExpanded, setIsExpanded] = useState(false)

    if (tasks.length === 0) return null

    const executingCount = tasks.filter((t) => t.status === 'executing').length
    const pausedCount = tasks.filter((t) => t.status === 'paused').length
    const completedCount = tasks.filter(
      (t) => t.status === 'completed' || t.status === 'error',
    ).length

    return (
      <div className='relative'>
        {/* Compact Indicator */}
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: [0.32, 0, 0.67, 0] }}
          className={cn(
            'flex items-center justify-between border-b px-6 py-3',
            isDark ? 'border-white/5' : 'border-black/5',
            isDark
              ? 'bg-gradient-to-r from-white/[0.01] to-white/[0.02]'
              : 'bg-gradient-to-r from-black/[0.005] to-black/[0.01]',
          )}>
          <div className='flex items-center gap-3'>
            {/* Spinner */}
            {executingCount > 0 && (
              <div className='pt-0.5'>
                <Spinner size='sm' />
              </div>
            )}

            {/* Text */}
            <Typography variant='body' className='!text-[14px]'>
              {executingCount > 0 ? (
                <>
                  <span className='font-semibold'>{executingCount}</span>{' '}
                  {executingCount === 1
                    ? 'background agent'
                    : 'background agents'}{' '}
                  executing
                </>
              ) : pausedCount > 0 ? (
                <>
                  <span className='font-semibold'>{pausedCount}</span>{' '}
                  {pausedCount === 1 ? 'background agent' : 'background agents'}{' '}
                  paused
                </>
              ) : (
                <>
                  <span className='font-semibold'>{completedCount}</span>{' '}
                  completed {completedCount === 1 ? 'task' : 'tasks'}
                </>
              )}
            </Typography>

            {/* Status badges */}
            <div className='flex items-center gap-2'>
              {executingCount > 0 && (
                <div className='flex items-center gap-1.5'>
                  <m.div
                    className='h-1.5 w-1.5 rounded-full bg-[#0098FC]'
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                  <span
                    className='text-[11px] font-medium'
                    style={{ color: '#0098FC' }}>
                    {executingCount} active
                  </span>
                </div>
              )}
              {pausedCount > 0 && (
                <div className='flex items-center gap-1.5'>
                  <div className='h-1.5 w-1.5 rounded-full bg-[#FE9F0C] opacity-70' />
                  <span
                    className='text-[11px] font-medium'
                    style={{ color: '#FE9F0C' }}>
                    {pausedCount} paused
                  </span>
                </div>
              )}
              {completedCount > 0 && executingCount > 0 && (
                <div className='flex items-center gap-1.5'>
                  <div className='h-1.5 w-1.5 rounded-full bg-[#10B981]' />
                  <span
                    className='text-[11px] font-medium'
                    style={{ color: '#10B981' }}>
                    {completedCount} done
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expand/Collapse Button */}
          <m.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              'flex items-center',
              isDark ? 'text-white/70' : 'text-black/70',
            )}>
            <m.svg
              width={14}
              height={14}
              viewBox='0 0 24 24'
              fill='none'
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}>
              <path
                d='M6 9L12 15L18 9'
                stroke='currentColor'
                strokeWidth='2'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </m.svg>
          </m.button>
        </m.div>

        {/* Expanded View */}
        <AnimatePresence>
          {isExpanded && (
            <m.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                duration: 0.3,
                ease: [0.32, 0, 0.67, 0],
              }}
              className='overflow-hidden'>
              <div
                className={cn(
                  'divide-y',
                  isDark ? 'divide-white/5' : 'divide-black/5',
                )}>
                {tasks.map((task, index) => (
                  <ExecutionCard
                    key={task.id}
                    task={task}
                    isDark={isDark}
                    index={index}
                    onStop={onStop}
                    onPause={onPause}
                    onPlay={onPlay}
                    onDismiss={onDismiss}
                  />
                ))}
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </div>
    )
  },
)

GlobalExecutionIndicator.displayName = 'GlobalExecutionIndicator'
