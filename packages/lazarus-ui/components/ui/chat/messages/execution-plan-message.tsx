'use client'

import * as m from 'motion/react-m'
import { memo, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useTheme } from '@/hooks/ui/use-theme'
import { cn } from '@/lib/utils'

import { ChatMessage, ExecutionPlanTodo } from '../types'

export interface ExecutionPlanMessageProps {
  message: ChatMessage & {
    variant: {
      type: 'execution-plan'
      title: string
      todos: ExecutionPlanTodo[]
      expandable?: boolean
    }
  }
  className?: string
  uiVariant?: 'mobile' | 'desktop'
}

/**
 * ExecutionPlanMessage - Shows an execution plan with a list of todos
 * Todos can be checked off as completed, with collapsible updates
 */
export const ExecutionPlanMessage = memo<ExecutionPlanMessageProps>(
  ({ message, className, uiVariant = 'desktop' }) => {
    const { title, todos } = message.variant
    const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set())
    const [showAllUpdates, setShowAllUpdates] = useState(false)
    const [hoveredTodoId, setHoveredTodoId] = useState<string | null>(null)
    const [executionState, setExecutionState] = useState<
      'running' | 'paused' | 'stopped'
    >('running')
    const { isDark } = useTheme()
    const isUser = message.role === 'user'

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

    const getStatusIcon = (status: ExecutionPlanTodo['status']) => {
      switch (status) {
        case 'completed':
          return (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
              <i
                className='ri-checkbox-circle-line text-[14px]'
                style={{ color: '#0098FC' }}
              />
            </m.div>
          )
        case 'in_progress':
          return <Spinner size='sm' className='h-4 w-4' />
        case 'failed':
          return (
            <m.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
              <i className='ri-close-circle-line text-[14px] text-red-500' />
            </m.div>
          )
        case 'pending':
        default:
          return (
            <i
              className={cn(
                'ri-checkbox-blank-circle-line text-[14px]',
                isDark ? 'text-white/20' : 'text-gray-300',
              )}
            />
          )
      }
    }

    const hasAnyUpdates = todos.some(
      (todo) => todo.updates && todo.updates.length > 0,
    )

    const completedCount = todos.filter((t) => t.status === 'completed').length
    const progressPercentage = (completedCount / todos.length) * 100

    const hasInProgress = todos.some((t) => t.status === 'in_progress')

    return (
      <div className={cn(isUser ? 'text-right' : 'text-left', className)}>
        <div
          className={cn(
            'message-bubble relative z-20 inline-block max-w-full px-[14px] py-[10px]',
            'rounded-[18px]',
            'shadow-[0_1px_0.5px_rgba(0,0,0,0.07)]',
            isUser
              ? [
                  'bg-[#33a9fd] text-white dark:bg-[#0098FC] dark:text-white',
                  'ml-auto',
                ]
              : [
                  'bg-muted text-foreground dark:bg-chat-agent-bg dark:text-white',
                  'mr-auto',
                ],
            uiVariant === 'mobile' ? 'max-w-[85%]' : 'max-w-[500px]',
          )}>
          {/* Header */}
          <div className='mb-4'>
            <h3
              className={cn(
                'mb-3 text-[16px] font-semibold',
                isUser ? 'text-white' : isDark ? 'text-white' : 'text-gray-900',
              )}>
              {title}
            </h3>

            {/* Progress bar with count */}
            <div className='flex items-center gap-3'>
              <div className='flex-1'>
                <div
                  className={cn(
                    'h-1.5 w-full overflow-hidden rounded-full',
                    isUser
                      ? 'bg-white/20'
                      : isDark
                        ? 'bg-white/10'
                        : 'bg-gray-200',
                  )}>
                  <m.div
                    className='h-full bg-gradient-to-r from-[#0098FC] to-[#00D4FF]'
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPercentage}%` }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                  />
                </div>
              </div>

              <div className='flex items-center gap-2'>
                {/* Progress count */}
                <span
                  className={cn(
                    'text-[12px] font-medium tabular-nums',
                    isUser
                      ? 'text-white/60'
                      : isDark
                        ? 'text-white/40'
                        : 'text-gray-500',
                  )}>
                  {completedCount}/{todos.length}
                </span>

                {/* Controls */}
                {hasInProgress && (
                  <div className='flex items-center gap-1'>
                    {executionState === 'running' ? (
                      <>
                        <button
                          onClick={() => setExecutionState('paused')}
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full transition-all',
                            'hover:scale-110 active:scale-95',
                            isUser
                              ? 'bg-white/10 hover:bg-white/20'
                              : isDark
                                ? 'bg-white/5 hover:bg-white/10'
                                : 'bg-gray-100 hover:bg-gray-200',
                          )}
                          title='Pause'>
                          <i
                            className={cn(
                              'ri-pause-line text-[12px]',
                              isUser
                                ? 'text-white'
                                : isDark
                                  ? 'text-white/70'
                                  : 'text-gray-700',
                            )}
                          />
                        </button>
                        <button
                          onClick={() => setExecutionState('stopped')}
                          className={cn(
                            'flex h-6 w-6 items-center justify-center rounded-full transition-all',
                            'hover:scale-110 active:scale-95',
                            isUser
                              ? 'bg-white/10 hover:bg-white/20'
                              : isDark
                                ? 'bg-white/5 hover:bg-white/10'
                                : 'bg-gray-100 hover:bg-gray-200',
                          )}
                          title='Stop'>
                          <i
                            className={cn(
                              'ri-stop-line text-[12px]',
                              isUser
                                ? 'text-white'
                                : isDark
                                  ? 'text-white/70'
                                  : 'text-gray-700',
                            )}
                          />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setExecutionState('running')}
                        className={cn(
                          'flex h-6 w-6 items-center justify-center rounded-full transition-all',
                          'hover:scale-110 active:scale-95',
                          executionState === 'paused'
                            ? isUser
                              ? 'bg-yellow-500/20 hover:bg-yellow-500/30'
                              : 'bg-yellow-500/10 hover:bg-yellow-500/20'
                            : isUser
                              ? 'bg-red-500/20 hover:bg-red-500/30'
                              : 'bg-red-500/10 hover:bg-red-500/20',
                        )}
                        title={
                          executionState === 'paused' ? 'Resume' : 'Restart'
                        }>
                        <i
                          className={cn(
                            'ri-play-line text-[12px]',
                            executionState === 'paused'
                              ? 'text-yellow-600'
                              : 'text-red-600',
                          )}
                        />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Show/Hide All Updates Button */}
          {hasAnyUpdates && (
            <div className='mb-3'>
              <button
                onClick={() => setShowAllUpdates(!showAllUpdates)}
                className={cn(
                  'text-xs font-medium transition-all',
                  'hover:opacity-80',
                  isUser
                    ? 'text-white/60'
                    : isDark
                      ? 'text-white/40'
                      : 'text-gray-500',
                )}>
                <i
                  className={cn(
                    'ri-arrow-down-s-line mr-1 transition-transform',
                    showAllUpdates && 'rotate-180',
                  )}
                />
                {showAllUpdates ? 'Hide all updates' : 'Show all updates'}
              </button>
            </div>
          )}

          {/* Todo List */}
          <div className='space-y-2'>
            {todos.map((todo, index) => (
              <m.div
                key={todo.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onMouseEnter={() => setHoveredTodoId(todo.id)}
                onMouseLeave={() => setHoveredTodoId(null)}>
                <div className='flex items-start gap-2.5'>
                  <div className='mt-0.5 flex h-5 w-5 items-center justify-center'>
                    {getStatusIcon(todo.status)}
                  </div>
                  <div className='flex-1'>
                    <div className='flex items-start justify-between gap-2'>
                      <span
                        className={cn(
                          'text-[15px]',
                          todo.status === 'completed' &&
                            cn(
                              'line-through',
                              isUser
                                ? 'text-white/60'
                                : isDark
                                  ? 'text-white/40'
                                  : 'text-gray-500',
                            ),
                          todo.status === 'failed' &&
                            cn(
                              isUser
                                ? 'text-white/80'
                                : isDark
                                  ? 'text-white/60'
                                  : 'text-gray-600',
                            ),
                        )}>
                        {todo.title}
                      </span>
                      {todo.updates &&
                        todo.updates.length > 0 &&
                        !showAllUpdates && (
                          <button
                            onClick={() => toggleTodoExpanded(todo.id)}
                            className={cn(
                              'shrink-0 transition-all duration-200',
                              'opacity-0',
                              hoveredTodoId === todo.id && 'opacity-100',
                              isUser
                                ? 'text-white/50 hover:text-white/70'
                                : isDark
                                  ? 'text-white/30 hover:text-white/50'
                                  : 'text-gray-400 hover:text-gray-600',
                            )}>
                            <i
                              className={cn(
                                'text-xs transition-transform duration-200',
                                expandedTodos.has(todo.id)
                                  ? 'ri-arrow-up-s-line'
                                  : 'ri-arrow-down-s-line',
                              )}
                            />
                          </button>
                        )}
                    </div>

                    {/* Updates */}
                    {todo.updates &&
                      todo.updates.length > 0 &&
                      (expandedTodos.has(todo.id) || showAllUpdates) && (
                        <m.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className='mt-2 space-y-1 overflow-hidden'>
                          {todo.updates.map((update) => (
                            <div
                              key={update.id}
                              className={cn(
                                'flex items-start gap-2 pl-6 text-xs',
                                isUser
                                  ? 'text-white/60'
                                  : isDark
                                    ? 'text-white/40'
                                    : 'text-gray-500',
                              )}>
                              <i className='ri-corner-down-right-line mt-0.5 shrink-0 text-[10px]' />
                              <span>{update.content}</span>
                            </div>
                          ))}
                        </m.div>
                      )}
                  </div>
                </div>
              </m.div>
            ))}
          </div>
        </div>
      </div>
    )
  },
)

ExecutionPlanMessage.displayName = 'ExecutionPlanMessage'
