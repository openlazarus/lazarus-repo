'use client'

import * as m from 'motion/react-m'
import Image from 'next/image'
import React, { memo, useState } from 'react'

import {
  RiCheckboxCircleFill,
  RiCloseCircleFill,
  RiMailLine,
  RiMessageLine,
  RiTimeLine,
} from '@remixicon/react'

import { Typography } from '@/components/ui'
import Spinner from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import {
  formatDuration,
  formatTemporalContext,
  getAffectedEntitiesCount,
  Log,
  PlatformSource,
  selectActivityView,
} from '@/model/log'

const STATUS_ICONS: Record<string, () => React.ReactNode> = {
  failed: () => (
    <RiCloseCircleFill size={16} className='shrink-0 text-red-500' />
  ),
  executing: () => <Spinner size='sm' />,
  pending: () => <Spinner size='sm' />,
}

const defaultStatusIcon = () => (
  <RiCheckboxCircleFill size={16} className='shrink-0 text-green-500' />
)

function getStatusIcon(status?: string): React.ReactNode {
  return (STATUS_ICONS[status || ''] || defaultStatusIcon)()
}

interface ActivityLogItemProps {
  log: Log
  isDark: boolean
  index: number
  onClick?: (log: Log) => void
}

/**
 * Get the platform icon component for a given platform source
 */
function PlatformIcon({
  platform,
  className,
}: {
  platform?: PlatformSource
  className?: string
}) {
  const iconClass = className || 'h-4 w-4'

  switch (platform) {
    case 'discord':
      return (
        <Image
          src='/logos/discord-logo.svg'
          alt='Discord'
          width={16}
          height={16}
          className={iconClass}
        />
      )
    case 'slack':
      return (
        <Image
          src='/logos/slack-logo.svg'
          alt='Slack'
          width={16}
          height={16}
          className={iconClass}
        />
      )
    case 'email':
      return <RiMailLine className={iconClass} />
    case 'chat':
      return <RiMessageLine className={cn(iconClass, 'text-[#0098FC]')} />
    default:
      return null
  }
}

export const ActivityLogItem = memo(
  ({ log, isDark, index, onClick }: ActivityLogItemProps) => {
    const [isHovered, setIsHovered] = useState(false)

    // Transform log data for display
    const activityView = selectActivityView(log)
    const entityChanges = getAffectedEntitiesCount(log)

    // Get up to 3 memory cells to display
    const displayedCells = log.memoryCells?.slice(0, 3) || []
    const moreCellsCount = (log.memoryCells?.length || 0) - 3

    // Get amount if present (for experiments/financial activities)
    const amount = log.metadata?.amount

    // Generate avatar gradient for agents
    const avatarGradient = activityView.actor.gradient

    // Use conversationTitle if available, otherwise fall back to title
    const displayTitle = log.conversationTitle || log.title

    // Get relative time for display
    const relativeTime = formatTemporalContext(log)

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
        onClick={() => onClick?.(log)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          'group relative overflow-hidden',
          onClick && 'cursor-pointer',
        )}>
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
        <div className='relative z-10 px-6 py-4 transition-all duration-200'>
          {/* First Line - Action text with badges */}
          <div className='mb-2 flex items-center gap-2'>
            {/* Status Icon */}
            {getStatusIcon(log.status)}

            {/* Platform Icon */}
            {log.platformSource && (
              <PlatformIcon platform={log.platformSource} className='h-4 w-4' />
            )}

            {/* Action text */}
            <Typography variant='body' className='!text-[14px]'>
              {displayTitle}
            </Typography>

            {/* Amount badge (for experiments/financial) */}
            {amount && (
              <m.div
                className='rounded-full bg-green-500/10 px-2 py-0.5'
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.08 + 0.2 }}>
                <span className='text-[11px] font-medium text-green-500'>
                  {amount}
                </span>
              </m.div>
            )}

            {/* Workspace badge */}
            {log.workspaceName && (
              <m.div
                className='rounded-full bg-[#0098FC]/10 px-2 py-0.5'
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.08 + 0.2 }}>
                <span className='text-[11px] font-medium text-[#0098FC]'>
                  {log.workspaceName}
                </span>
              </m.div>
            )}

            {/* Spacer */}
            <div className='flex-1' />

            {/* Time */}
            <div className='flex items-center gap-1'>
              <RiTimeLine
                className={cn(
                  'h-3 w-3',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}
              />
              <span
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-white/50' : 'text-black/50',
                )}>
                {relativeTime}
              </span>
            </div>

            {/* Entity changes (show on hover) */}
            {(entityChanges.added > 0 ||
              entityChanges.modified > 0 ||
              entityChanges.removed > 0) && (
              <m.div
                className='flex items-center gap-2'
                initial={{ opacity: 0, x: 10 }}
                animate={{
                  opacity: isHovered ? 1 : 0,
                  x: isHovered ? 0 : 10,
                }}
                transition={{
                  duration: 0.3,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}>
                {entityChanges.added > 0 && (
                  <span className='text-[11px] font-medium text-green-500'>
                    +{entityChanges.added}
                  </span>
                )}
                {entityChanges.modified > 0 && (
                  <span className='text-[11px] font-medium text-yellow-500'>
                    ~{entityChanges.modified}
                  </span>
                )}
                {entityChanges.removed > 0 && (
                  <span className='text-[11px] font-medium text-red-500'>
                    -{entityChanges.removed}
                  </span>
                )}
              </m.div>
            )}
          </div>

          {/* Metrics Row - Duration, tools, messages, trigger */}
          {(log.metadata?.totalDuration ||
            log.conversation?.length ||
            log.apps?.length ||
            log.executionContext?.triggeredBy) && (
            <div className='mb-2 flex items-center gap-3'>
              {/* Duration */}
              {log.metadata?.totalDuration && (
                <span
                  className={cn(
                    'text-[11px] font-medium tabular-nums',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}>
                  {formatDuration(log.metadata.totalDuration)}
                </span>
              )}

              {/* Tool calls count */}
              {log.apps && log.apps.length > 0 && (
                <>
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/20' : 'text-black/20',
                    )}>
                    |
                  </span>
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    {log.apps.length} tool{log.apps.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}

              {/* Message count */}
              {log.conversation && log.conversation.length > 0 && (
                <>
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/20' : 'text-black/20',
                    )}>
                    |
                  </span>
                  <span
                    className={cn(
                      'text-[11px] tabular-nums',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    {log.conversation.length} msg
                    {log.conversation.length !== 1 ? 's' : ''}
                  </span>
                </>
              )}

              {/* Trigger type */}
              {log.executionContext?.triggeredBy &&
                log.executionContext.triggeredBy !== 'user' && (
                  <>
                    <span
                      className={cn(
                        'text-[11px]',
                        isDark ? 'text-white/20' : 'text-black/20',
                      )}>
                      |
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                        log.executionContext.triggeredBy === 'email'
                          ? 'bg-blue-500/10 text-blue-400'
                          : log.executionContext.triggeredBy === 'webhook'
                            ? 'bg-purple-500/10 text-purple-400'
                            : log.executionContext.triggeredBy === 'schedule'
                              ? 'bg-amber-500/10 text-amber-400'
                              : isDark
                                ? 'bg-white/5 text-white/50'
                                : 'bg-black/5 text-black/50',
                      )}>
                      via {log.executionContext.triggeredBy}
                    </span>
                  </>
                )}
            </div>
          )}

          {/* Second Line - Memory cells and actor */}
          <div className='flex items-center justify-between'>
            {/* Left: Memory cells */}
            <div className='flex items-center gap-2'>
              {displayedCells.map((cell, i) => (
                <m.div
                  key={cell.id}
                  className={cn(
                    'rounded-full px-2 py-0.5',
                    isDark ? 'bg-white/5' : 'bg-black/5',
                  )}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: index * 0.08 + 0.3 + i * 0.05 }}>
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/60' : 'text-black/60',
                    )}>
                    {cell.name}
                  </span>
                </m.div>
              ))}
              {moreCellsCount > 0 && (
                <m.div
                  className={cn(
                    'rounded-full px-2 py-0.5',
                    isDark ? 'bg-white/5' : 'bg-black/5',
                  )}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    delay: index * 0.08 + 0.3 + displayedCells.length * 0.05,
                  }}>
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    +{moreCellsCount} more
                  </span>
                </m.div>
              )}
            </div>

            {/* Right: Actor info */}
            <div className='flex items-center gap-2'>
              <span
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                {activityView.actor.type === 'agent'
                  ? 'by agent'
                  : 'performed by'}
              </span>
              <span
                className={cn(
                  'text-[11px] font-medium',
                  isDark ? 'text-white/70' : 'text-black/70',
                )}>
                {activityView.actor.name}
              </span>
              {/* Avatar */}
              <m.div
                className='h-5 w-5 overflow-hidden rounded-full'
                style={{
                  background: avatarGradient || '#e5e7eb',
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.08 + 0.5 }}>
                {log.actor.avatar ? (
                  <img
                    src={log.actor.avatar}
                    alt={log.actor.name}
                    className='h-full w-full object-cover'
                  />
                ) : (
                  <div className='flex h-full w-full items-center justify-center text-[10px] font-semibold text-white'>
                    {activityView.actor.initials}
                  </div>
                )}
              </m.div>
            </div>
          </div>
        </div>
      </m.div>
    )
  },
)

ActivityLogItem.displayName = 'ActivityLogItem'
