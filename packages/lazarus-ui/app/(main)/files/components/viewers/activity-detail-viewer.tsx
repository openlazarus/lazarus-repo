'use client'

import Image from 'next/image'
import { useMemo } from 'react'

import { RiMailLine, RiMessageLine, RiTimeLine } from '@remixicon/react'

import { Typography } from '@/components/ui'
import { MessageList } from '@/components/ui/chat/message-list'
import Spinner from '@/components/ui/spinner'
import { useAuth } from '@/hooks/auth/use-auth'
import { useGetActivityLog } from '@/hooks/features/activity'
import { useTheme } from '@/hooks/ui/use-theme'
import { convertToChatMessages } from '@/lib/activity-utils'
import { cn } from '@/lib/utils'
import {
  formatTokenCount,
  Log,
  PlatformSource,
  selectActivityView,
} from '@/model/log'
import { ExecutionSummaryPanel } from './execution-summary-panel'

interface ActivityDetailViewerProps {
  logId: string
  workspaceId: string
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
  const iconClass = className || 'h-5 w-5'

  switch (platform) {
    case 'discord':
      return (
        <Image
          src='/logos/discord-logo.svg'
          alt='Discord'
          width={20}
          height={20}
          className={iconClass}
        />
      )
    case 'slack':
      return (
        <Image
          src='/logos/slack-logo.svg'
          alt='Slack'
          width={20}
          height={20}
          className={iconClass}
        />
      )
    case 'email':
      return <RiMailLine className={iconClass} />
    case 'chat':
      return <RiMessageLine className={cn(iconClass, 'text-[#0098FC]')} />
    default:
      return <RiMessageLine className={cn(iconClass, 'text-gray-400')} />
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function ActivityDetailViewer({
  logId,
  workspaceId,
}: ActivityDetailViewerProps) {
  const { isDark } = useTheme()
  const { session } = useAuth()
  const userId = session?.user?.id

  const {
    data,
    loading,
    error: fetchError,
  } = useGetActivityLog(workspaceId, logId, userId ? { userId } : undefined)

  const log = useMemo(() => {
    if (!data?.log) return null
    return {
      ...data.log,
      timestamp: new Date(data.log.timestamp),
    } as unknown as Log
  }, [data])

  const error = fetchError
    ? fetchError instanceof Error
      ? fetchError.message
      : 'Failed to load activity log'
    : null

  // Memoize derived values
  const activityView = useMemo(
    () => (log ? selectActivityView(log) : null),
    [log],
  )
  const chatMessages = useMemo(
    () => (log ? convertToChatMessages(log) : []),
    [log],
  )
  const displayTitle = log?.conversationTitle || log?.title || 'Activity'
  const avatarGradient = activityView?.actor.gradient

  // Count only text messages for display
  const messageCount = chatMessages.filter(
    (msg) => msg.variant.type === 'text',
  ).length

  if (loading) {
    return (
      <div className='flex h-full items-center justify-center'>
        <Spinner size='lg' />
      </div>
    )
  }

  if (error || !log) {
    return (
      <div className='flex h-full flex-col items-center justify-center gap-2'>
        <RiMessageLine
          className={cn(
            'h-12 w-12',
            isDark ? 'text-white/30' : 'text-black/30',
          )}
        />
        <Typography
          variant='body'
          className={cn(
            '!text-[14px]',
            isDark ? 'text-white/50' : 'text-black/50',
          )}>
          {error || 'Activity log not found'}
        </Typography>
      </div>
    )
  }

  return (
    <div className='flex h-full flex-col overflow-hidden'>
      {/* Header - Compact */}
      <div
        className={cn(
          'shrink-0 border-b px-4 py-2',
          isDark ? 'border-white/10 bg-background' : 'border-black/10 bg-white',
        )}>
        <div className='flex items-center gap-3'>
          {/* Platform Icon */}
          {log.platformSource && (
            <PlatformIcon
              platform={log.platformSource}
              className='h-4 w-4 shrink-0'
            />
          )}

          {/* Title */}
          <Typography
            variant='body'
            className={cn(
              'line-clamp-1 flex-1 !text-[14px] font-medium',
              isDark ? 'text-white' : 'text-black',
            )}>
            {displayTitle}
          </Typography>

          {/* Time */}
          <div className='flex shrink-0 items-center gap-1'>
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
              {formatTimestamp(log.timestamp)}
            </span>
          </div>

          {/* Actor */}
          <div className='flex shrink-0 items-center gap-2'>
            <span
              className={cn(
                'text-[11px]',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              by
            </span>
            <span
              className={cn(
                'text-[11px] font-medium',
                isDark ? 'text-white/70' : 'text-black/70',
              )}>
              {activityView?.actor.name}
            </span>
            <div
              className='flex h-5 w-5 items-center justify-center rounded-full'
              style={{ background: avatarGradient || '#e5e7eb' }}>
              {log.actor.avatar ? (
                <img
                  src={log.actor.avatar}
                  alt={log.actor.name}
                  className='h-full w-full rounded-full object-cover'
                />
              ) : (
                <span className='text-[9px] font-semibold text-white'>
                  {activityView?.actor.initials}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Execution Summary Panel */}
      <ExecutionSummaryPanel log={log} isDark={isDark} />

      {/* Conversation content */}
      <div className='min-h-0 flex-1'>
        {chatMessages.length > 0 ? (
          <MessageList messages={chatMessages} variant='desktop' />
        ) : (
          <div
            className={cn(
              'flex h-full flex-col items-center justify-center py-12',
              isDark ? 'text-white/40' : 'text-black/40',
            )}>
            <RiMessageLine className='mb-3 h-12 w-12 opacity-50' />
            <Typography variant='body' className='!text-[14px]'>
              No conversation transcript available
            </Typography>
            <Typography variant='body' className='mt-1 !text-[12px] opacity-70'>
              This activity log doesn&apos;t contain detailed conversation data
            </Typography>
          </div>
        )}
      </div>

      {/* Footer with metadata */}
      <div
        className={cn(
          'shrink-0 border-t px-6 py-3',
          isDark ? 'border-white/10 bg-background' : 'border-black/10 bg-white',
        )}>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-4'>
            {/* Memory cells */}
            {log.memoryCells && log.memoryCells.length > 0 && (
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'text-[11px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  Memory:
                </span>
                {log.memoryCells.slice(0, 2).map((cell) => (
                  <span
                    key={cell.id}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[11px]',
                      isDark
                        ? 'bg-white/5 text-white/60'
                        : 'bg-black/5 text-black/60',
                    )}>
                    {cell.name}
                  </span>
                ))}
                {log.memoryCells.length > 2 && (
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/40' : 'text-black/40',
                    )}>
                    +{log.memoryCells.length - 2} more
                  </span>
                )}
              </div>
            )}

            {/* Token usage breakdown */}
            {log.tokenUsage && (
              <div className='flex items-center gap-2'>
                <span
                  className={cn(
                    'text-[11px] tabular-nums',
                    isDark ? 'text-white/35' : 'text-black/35',
                  )}>
                  {formatTokenCount(log.tokenUsage.inputTokens)} in /{' '}
                  {formatTokenCount(log.tokenUsage.outputTokens)} out
                </span>
                {log.tokenUsage.model && (
                  <span
                    className={cn(
                      'rounded px-1.5 py-0.5 text-[10px]',
                      isDark
                        ? 'bg-white/5 text-white/35'
                        : 'bg-black/5 text-black/35',
                    )}>
                    {log.tokenUsage.model}
                  </span>
                )}
              </div>
            )}

            {/* Files modified count */}
            {log.filesModified && log.filesModified.length > 0 && (
              <span
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-white/35' : 'text-black/35',
                )}>
                {log.filesModified.length} file
                {log.filesModified.length !== 1 ? 's' : ''} modified
              </span>
            )}
          </div>

          {/* Message count */}
          {messageCount > 0 && (
            <span
              className={cn(
                'text-[12px]',
                isDark ? 'text-white/40' : 'text-black/40',
              )}>
              {messageCount} message
              {messageCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
