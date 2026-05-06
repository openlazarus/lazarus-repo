'use client'

import * as m from 'motion/react-m'
import Image from 'next/image'
import { useMemo } from 'react'

import {
  RiCloseLine,
  RiMailLine,
  RiMessageLine,
  RiTimeLine,
} from '@remixicon/react'

import { Typography } from '@/components/ui'
import { MessageList } from '@/components/ui/chat/message-list'
import { ChatMessage } from '@/components/ui/chat/types'
import { cn } from '@/lib/utils'
import { Log, PlatformSource, selectActivityView } from '@/model/log'

interface ActivityDetailModalProps {
  log: Log
  isDark: boolean
  onClose: () => void
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
 * Get platform display name
 */
function getPlatformName(platform?: PlatformSource): string {
  switch (platform) {
    case 'discord':
      return 'Discord'
    case 'slack':
      return 'Slack'
    case 'email':
      return 'Email'
    case 'chat':
      return 'Chat'
    default:
      return 'Conversation'
  }
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: Date): string {
  const date = new Date(timestamp)
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Convert activity log conversation to ChatMessage format
 */
function convertToChatMessages(log: Log): ChatMessage[] {
  if (!log.conversation || log.conversation.length === 0) {
    return []
  }

  return log.conversation
    .filter((msg) => msg.role !== 'tool' && msg.role !== 'system')
    .map((msg) => ({
      id: msg.id,
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      timestamp: new Date(msg.timestamp),
      variant: {
        type: 'text' as const,
        content: msg.content,
        status: 'sent' as const,
      },
    }))
}

export function ActivityDetailModal({
  log,
  isDark,
  onClose,
}: ActivityDetailModalProps) {
  const activityView = selectActivityView(log)
  const avatarGradient = activityView.actor.gradient

  // Get the display title
  const displayTitle = log.conversationTitle || log.title

  // Convert conversation to chat messages
  const chatMessages = useMemo(() => convertToChatMessages(log), [log])

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm'
      onClick={onClose}>
      <m.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'relative flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl shadow-2xl',
          isDark ? 'bg-[#1a1a1a]' : 'bg-white',
        )}>
        {/* Header */}
        <div
          className={cn(
            'shrink-0 border-b px-6 py-4',
            isDark
              ? 'border-white/10 bg-[#1a1a1a]'
              : 'border-black/10 bg-white',
          )}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              {/* Platform Icon */}
              <div
                className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-lg',
                  isDark ? 'bg-white/5' : 'bg-black/5',
                )}>
                <PlatformIcon
                  platform={log.platformSource}
                  className='h-5 w-5'
                />
              </div>

              <div>
                <Typography
                  variant='h4'
                  className={cn(
                    '!text-[16px] font-semibold',
                    isDark ? 'text-white' : 'text-black',
                  )}>
                  {displayTitle}
                </Typography>
                <div className='mt-0.5 flex items-center gap-2'>
                  <span
                    className={cn(
                      'text-[12px]',
                      isDark ? 'text-white/50' : 'text-black/50',
                    )}>
                    {getPlatformName(log.platformSource)}
                  </span>
                  {log.platformMetadata?.channelName && (
                    <>
                      <span
                        className={cn(
                          'text-[12px]',
                          isDark ? 'text-white/30' : 'text-black/30',
                        )}>
                        •
                      </span>
                      <span
                        className={cn(
                          'text-[12px]',
                          isDark ? 'text-white/50' : 'text-black/50',
                        )}>
                        #{log.platformMetadata.channelName}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className={cn(
                'rounded-lg p-2 transition-colors',
                isDark
                  ? 'text-white/60 hover:bg-white/10'
                  : 'text-black/60 hover:bg-black/5',
              )}>
              <RiCloseLine className='h-5 w-5' />
            </button>
          </div>
        </div>

        {/* Conversation content using existing chat components */}
        <div className='min-h-0 flex-1 overflow-y-auto'>
          {chatMessages.length > 0 ? (
            <MessageList
              messages={chatMessages}
              variant='desktop'
              className='h-auto'
            />
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
              <Typography
                variant='body'
                className='mt-1 !text-[12px] opacity-70'>
                This activity log doesn&apos;t contain detailed conversation
                data
              </Typography>
            </div>
          )}
        </div>

        {/* Footer with metadata */}
        <div
          className={cn(
            'shrink-0 border-t px-6 py-3',
            isDark
              ? 'border-white/10 bg-[#1a1a1a]'
              : 'border-black/10 bg-white',
          )}>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-4'>
              {/* Agent info */}
              <div className='flex items-center gap-2'>
                <div
                  className='flex h-6 w-6 items-center justify-center rounded-full'
                  style={{ background: avatarGradient || '#e5e7eb' }}>
                  <span className='text-[9px] font-semibold text-white'>
                    {activityView.actor.initials}
                  </span>
                </div>
                <span
                  className={cn(
                    'text-[12px]',
                    isDark ? 'text-white/60' : 'text-black/60',
                  )}>
                  {activityView.actor.name}
                </span>
              </div>

              {/* Timestamp */}
              <div className='flex items-center gap-1'>
                <RiTimeLine
                  className={cn(
                    'h-3.5 w-3.5',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}
                />
                <span
                  className={cn(
                    'text-[12px]',
                    isDark ? 'text-white/40' : 'text-black/40',
                  )}>
                  {formatTimestamp(log.timestamp)}
                </span>
              </div>
            </div>

            {/* Message count */}
            {chatMessages.length > 0 && (
              <span
                className={cn(
                  'text-[12px]',
                  isDark ? 'text-white/40' : 'text-black/40',
                )}>
                {chatMessages.length} message
                {chatMessages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </m.div>
    </m.div>
  )
}
