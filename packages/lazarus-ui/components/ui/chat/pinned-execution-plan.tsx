'use client'

import {
  RiArrowDownSLine,
  RiArrowUpSLine,
  RiCloseLine,
  RiFileTextLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { memo, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

import { ExecutionPlanTodo } from './types'

export interface PinnedExecutionPlanProps {
  title: string
  todos: ExecutionPlanTodo[]
  onClose?: () => void
  className?: string
}

type ViewState = 'collapsed' | 'expanded' | 'hidden'

export const PinnedExecutionPlan = memo<PinnedExecutionPlanProps>(
  ({ title, todos, onClose, className }) => {
    const [viewState, setViewState] = useState<ViewState>('collapsed')
    const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set())
    const { isDark } = useTheme()

    const completedCount = todos.filter((t) => t.status === 'completed').length
    const currentTask = todos.find((t) => t.status === 'in_progress')
    const progressPercentage = (completedCount / todos.length) * 100
    const isComplete = completedCount === todos.length
    const isExecuting = !isComplete && !!currentTask

    const toggleTodoExpanded = (todoId: string) => {
      setExpandedTodos((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(todoId)) {
          newSet.delete(todoId)
        } else {
          newSet.add(todoId)
        }
        return newSet
      })
    }

    // When hidden, show a minimal bar
    if (viewState === 'hidden') {
      return (
        <m.div
          className={cn(
            'w-full',
            'border-b',
            isDark
              ? 'border-white/10 bg-[#0a0a0a]'
              : 'border-gray-200 bg-white',
            className,
          )}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}>
          <div className='flex items-center justify-between px-4 py-2'>
            <button
              onClick={() => setViewState('collapsed')}
              className='flex flex-1 items-center gap-2'>
              <m.div
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  isComplete
                    ? 'bg-green-500'
                    : isExecuting
                      ? 'bg-[#0098FC]'
                      : 'bg-orange-500',
                )}
                animate={
                  !isComplete && isExecuting ? { opacity: [1, 0.4, 1] } : {}
                }
                transition={{ repeat: Infinity, duration: 1.5 }}
              />
              <span
                className={cn(
                  'text-xs',
                  isDark ? 'text-white/50' : 'text-[#86868b]',
                )}>
                {title} · {completedCount}/{todos.length}
              </span>
              <RiArrowDownSLine
                size={14}
                className={cn(isDark ? 'text-white/50' : 'text-[#86868b]')}
              />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  isDark
                    ? 'text-white/60 hover:bg-white/10 hover:text-white'
                    : 'text-[#86868b] hover:bg-gray-100 hover:text-[#1d1d1f]',
                )}>
                <RiCloseLine size={16} />
              </button>
            )}
          </div>
        </m.div>
      )
    }

    return (
      <m.div
        className={cn(
          'w-full',
          'border-b',
          isDark ? 'border-white/10 bg-[#0a0a0a]' : 'border-gray-200 bg-white',
          className,
        )}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}>
        <div className='px-4 py-3'>
          {/* Header */}
          <div className='mb-2 flex items-center justify-between'>
            <button
              onClick={() =>
                setViewState(
                  viewState === 'expanded' ? 'collapsed' : 'expanded',
                )
              }
              className='flex-1 text-left'>
              <div className='flex items-center gap-2'>
                <m.div
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isComplete
                      ? 'bg-green-500'
                      : isExecuting
                        ? 'bg-[#0098FC]'
                        : 'bg-orange-500',
                  )}
                  animate={
                    !isComplete && isExecuting ? { opacity: [1, 0.4, 1] } : {}
                  }
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <span
                  className={cn(
                    'text-sm font-semibold',
                    isDark ? 'text-white' : 'text-[#1d1d1f]',
                  )}>
                  {title}
                </span>
                <span
                  className={cn(
                    'text-xs',
                    isDark ? 'text-white/50' : 'text-[#86868b]',
                  )}>
                  {completedCount}/{todos.length}
                </span>
              </div>
            </button>

            {/* Controls */}
            <div className='flex items-center gap-2'>
              <button
                onClick={() => setViewState('hidden')}
                className={cn(
                  'rounded-md p-1 transition-colors',
                  isDark
                    ? 'text-white/60 hover:bg-white/10 hover:text-white'
                    : 'text-[#86868b] hover:bg-gray-100 hover:text-[#1d1d1f]',
                )}
                title='Hide execution plan'>
                <RiArrowUpSLine size={16} />
              </button>
              {onClose && (
                <button
                  onClick={onClose}
                  className={cn(
                    'rounded-md p-1 transition-colors',
                    isDark
                      ? 'text-white/60 hover:bg-white/10 hover:text-white'
                      : 'text-[#86868b] hover:bg-gray-100 hover:text-[#1d1d1f]',
                  )}>
                  <RiCloseLine size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div
            className={cn(
              'h-1 w-full overflow-hidden rounded-full',
              isDark ? 'bg-white/10' : 'bg-gray-200',
            )}>
            <m.div
              className={cn(
                'h-full',
                isComplete
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-[#0098FC] to-[#00D4FF]',
              )}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercentage}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>

          {/* Current Task (collapsed view) */}
          {viewState === 'collapsed' && currentTask && !isComplete && (
            <div
              className={cn(
                'mt-2 truncate text-xs',
                isDark ? 'text-white/50' : 'text-[#86868b]',
              )}>
              {currentTask.title}
            </div>
          )}

          {/* Task List (expanded view) */}
          {viewState === 'expanded' && (
            <m.div
              className='mt-3 space-y-1'
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}>
              {todos.map((todo) => {
                const hasLogs = todo.status !== 'pending'
                const isExpanded = expandedTodos.has(todo.id)

                return (
                  <div key={todo.id}>
                    <button
                      onClick={() => hasLogs && toggleTodoExpanded(todo.id)}
                      className={cn(
                        '-mx-2 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                        todo.status === 'completed' && 'opacity-60',
                        hasLogs &&
                          'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5',
                      )}
                      disabled={!hasLogs}>
                      <div className='flex-shrink-0'>
                        {todo.status === 'completed' && (
                          <div
                            className={cn(
                              'flex h-4 w-4 items-center justify-center rounded-full',
                              'bg-green-500/20',
                            )}>
                            <div className='h-1.5 w-1.5 rounded-full bg-green-500' />
                          </div>
                        )}
                        {todo.status === 'in_progress' && (
                          <Spinner size='sm' className='h-4 w-4' />
                        )}
                        {todo.status === 'pending' && (
                          <div
                            className={cn(
                              'h-4 w-4 rounded-full border',
                              isDark ? 'border-white/20' : 'border-gray-300',
                            )}
                          />
                        )}
                        {todo.status === 'failed' && (
                          <div className='flex h-4 w-4 items-center justify-center rounded-full bg-red-500/20'>
                            <div className='h-1.5 w-1.5 rounded-full bg-red-500' />
                          </div>
                        )}
                      </div>
                      <span
                        className={cn(
                          'flex-1',
                          todo.status === 'completed' && 'line-through',
                          todo.status === 'in_progress' && 'font-medium',
                          isDark ? 'text-white' : 'text-[#1d1d1f]',
                        )}>
                        {todo.title}
                      </span>
                      {hasLogs && (
                        <div className='flex items-center gap-1'>
                          <RiFileTextLine
                            size={14}
                            className={cn(
                              'transition-opacity',
                              isDark ? 'text-white/40' : 'text-[#86868b]',
                            )}
                          />
                          <RiArrowDownSLine
                            size={14}
                            className={cn(
                              'transition-transform',
                              isExpanded && 'rotate-180',
                              isDark ? 'text-white/40' : 'text-[#86868b]',
                            )}
                          />
                        </div>
                      )}
                    </button>

                    {/* Log/Update section */}
                    {isExpanded && todo.updates && (
                      <m.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.15 }}
                        className={cn(
                          'mb-2 ml-6 mt-1 rounded-md p-2 font-mono text-xs',
                          isDark ? 'bg-white/5' : 'bg-gray-50',
                          isDark ? 'text-white/70' : 'text-gray-700',
                        )}>
                        {todo.updates.map((update, idx) => (
                          <div key={update.id} className='py-0.5'>
                            <span
                              className={cn(
                                isDark ? 'text-white/50' : 'text-gray-500',
                              )}>
                              [{new Date(update.timestamp).toLocaleTimeString()}
                              ]
                            </span>{' '}
                            <span>{update.content}</span>
                          </div>
                        ))}
                      </m.div>
                    )}
                  </div>
                )
              })}
            </m.div>
          )}
        </div>
      </m.div>
    )
  },
)

PinnedExecutionPlan.displayName = 'PinnedExecutionPlan'
