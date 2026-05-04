'use client'

import { isSameDay } from 'date-fns'
import { memo, useEffect, useRef } from 'react'

import { TimeStamp } from '@/components/ui/timestamp'
import { cn } from '@/lib/utils'

import { MessageRenderer } from './message-renderer'
import { ChatMessage, MessageListProps } from './types'
import { TypingIndicator } from './typing-indicator'

/**
 * Groups consecutive messages intelligently
 * - Groups messages from same sender within time window
 * - Special handling for message+action combinations
 * - Tag+text combinations are always grouped
 */
function groupMessages(messages: ChatMessage[]): ChatMessage[][] {
  if (messages.length === 0) return []

  const groups: ChatMessage[][] = []
  let currentGroup: ChatMessage[] = [messages[0]]

  for (let i = 1; i < messages.length; i++) {
    const prevMessage = messages[i - 1]
    const currentMessage = messages[i]

    const timeDiff =
      currentMessage.timestamp.getTime() - prevMessage.timestamp.getTime()
    const isSameRole = currentMessage.role === prevMessage.role

    // Define what constitutes a logical message unit
    // iMessage-style: group consecutive messages from same sender
    const shouldGroup =
      isSameRole &&
      timeDiff < 5 * 60 * 1000 &&
      // Text followed by action (AI explaining then giving options)
      ((prevMessage.variant.type === 'text' &&
        currentMessage.variant.type === 'action') ||
        // Tag followed by text (user sending context with message)
        (prevMessage.variant.type === 'tag' &&
          currentMessage.variant.type === 'text') ||
        // Multiple tags sent together
        (prevMessage.variant.type === 'tag' &&
          currentMessage.variant.type === 'tag') ||
        // Multiple text messages from same sender (iMessage style - separate bubbles, shared tail)
        (prevMessage.variant.type === 'text' &&
          currentMessage.variant.type === 'text') ||
        // Background actions should group with surrounding messages
        (prevMessage.variant.type === 'background-action' &&
          currentMessage.variant.type === 'text') ||
        (prevMessage.variant.type === 'text' &&
          currentMessage.variant.type === 'background-action') ||
        // Selected action followed by response
        (prevMessage.variant.type === 'selected-action' &&
          currentMessage.variant.type === 'text'))

    if (shouldGroup) {
      currentGroup.push(currentMessage)
    } else {
      groups.push(currentGroup)
      currentGroup = [currentMessage]
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup)
  }

  return groups
}

/**
 * MessageList - Renders a list of chat messages with intelligent grouping
 *
 * Features:
 * - Automatic message grouping by role and time
 * - Smooth scrolling with anchor
 * - Empty state for new conversations
 * - Typing indicator support
 * - Intersection observer for read receipts
 */
export const MessageList = memo<MessageListProps>(
  ({
    messages,
    isLoading = false,
    showTypingIndicator = false,
    onMessageVisible,
    onActionClick,
    onRevertAction,
    onRetry,
    onReactionClick,
    onTapbackClick,
    onTagClick,
    onPermissionRespond,
    onAskUserQuestionRespond,
    className,
    variant = 'desktop',
  }) => {
    console.log('[MessageList] Rendering with messages:', messages)
    console.log('[MessageList] Messages count:', messages.length)
    messages.forEach((msg, idx) => {
      const content =
        'content' in msg.variant
          ? msg.variant.content
          : JSON.stringify(msg.variant)
      console.log(
        `[MessageList] Message ${idx}: role=${msg.role}, content="${content}"`,
      )
    })

    const listRef = useRef<HTMLDivElement>(null)
    const observerRef = useRef<IntersectionObserver | null>(null)
    const prevMessageCount = useRef(messages.length)

    // Filter out empty streaming messages (they'll show as typing indicator instead)
    const filteredMessages = messages.filter((msg) => {
      // For text variant, check content
      if (msg.variant.type === 'text') {
        // Filter out empty streaming messages
        if (msg.metadata?.isStreaming && !msg.variant.content?.trim()) {
          return false
        }
        return msg.variant.content && msg.variant.content.trim().length > 0
      }
      // Keep all other variant types (background-action, system, etc)
      return true
    })

    // Set up intersection observer for message visibility
    useEffect(() => {
      if (!onMessageVisible) return

      observerRef.current = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const messageId = entry.target.getAttribute('data-message-id')
              if (messageId) {
                onMessageVisible(messageId)
              }
            }
          })
        },
        {
          root: listRef.current,
          rootMargin: '0px',
          threshold: 0.5,
        },
      )

      return () => {
        observerRef.current?.disconnect()
      }
    }, [onMessageVisible])

    // Group messages for rendering
    const messageGroups = groupMessages(filteredMessages)
    console.log('[MessageList] Message groups:', messageGroups)
    console.log('[MessageList] Number of groups:', messageGroups.length)

    // Scroll to bottom when new messages arrive
    useEffect(() => {
      if (
        filteredMessages.length > prevMessageCount.current &&
        listRef.current
      ) {
        // Small delay to ensure DOM is updated
        requestAnimationFrame(() => {
          if (listRef.current) {
            const scrollHeight = listRef.current.scrollHeight
            const height = listRef.current.clientHeight
            const maxScrollTop = scrollHeight - height

            // Ensure we scroll to the very bottom, including padding
            listRef.current.scrollTo({
              top: maxScrollTop,
              behavior: 'smooth',
            })
          }
        })
      }
      prevMessageCount.current = filteredMessages.length
    }, [filteredMessages.length])

    // Show blank state if no messages
    if (filteredMessages.length === 0 && !isLoading) {
      return (
        <div
          className={cn(
            'message-list flex h-full items-center justify-center',
            className,
          )}>
          <div className='text-center'>
            <p
              className={cn(
                'text-sm',
                variant === 'mobile'
                  ? 'text-muted-foreground'
                  : 'text-muted-foreground/60',
              )}>
              Start a conversation
            </p>
          </div>
        </div>
      )
    }

    return (
      <div
        ref={listRef}
        className={cn(
          'message-list h-full overflow-y-auto overflow-x-hidden',
          // Padding for content
          variant === 'mobile' ? 'px-4 py-2' : 'px-4',
          // Smooth scrolling with CSS
          'scroll-smooth',
          // iOS momentum scrolling
          'overflow-y-scroll',
          '-webkit-overflow-scrolling-touch',
          // Custom scrollbar
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-black/10',
          className,
        )}
        style={{
          // Optimize scrolling
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch',
          // Prevent horizontal overflow
          maxWidth: '100%',
          // Add scroll padding to ensure last message is visible
          scrollPaddingBottom: '96px',
        }}>
        {/* Message groups with time headers */}
        <div className='space-y-3'>
          {messageGroups.map((group, index) => {
            const groupDate = group[0].timestamp
            const prevGroup = index > 0 ? messageGroups[index - 1] : null
            const showTimeHeader =
              !prevGroup || !isSameDay(groupDate, prevGroup[0].timestamp)

            return (
              <div key={`group-${group[0].id}-${index}`}>
                {showTimeHeader && (
                  <div className='mb-5 flex justify-center'>
                    <TimeStamp
                      date={groupDate}
                      format='header'
                      variant='header'
                    />
                  </div>
                )}

                {/* Render message group with proper spacing */}
                <div
                  className={cn(
                    'message-group',
                    // Add spacing between groups
                    index < messageGroups.length - 1 && 'mb-2',
                  )}>
                  {group.map((message, msgIndex) => (
                    <div
                      key={message.id}
                      className={cn(
                        // Tight spacing within groups
                        msgIndex < group.length - 1 && 'mb-[2px]',
                      )}>
                      <MessageRenderer
                        message={message}
                        isGrouped={group.length > 1}
                        isLastInGroup={msgIndex === group.length - 1}
                        showTimestamp={false}
                        onRetry={onRetry}
                        onActionClick={onActionClick}
                        onRevertAction={onRevertAction}
                        onReactionClick={onReactionClick}
                        onTapbackClick={onTapbackClick}
                        onTagClick={onTagClick}
                        onPermissionRespond={onPermissionRespond}
                        onAskUserQuestionRespond={onAskUserQuestionRespond}
                        variant={variant}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* Typing indicator */}
        {showTypingIndicator && (
          <div className='mt-6'>
            <TypingIndicator isVisible={true} />
          </div>
        )}

        {/* Scroll anchor - keeps scroll at bottom */}
        {/* Add significant padding to prevent last message from being hidden behind message bar */}
        <div className='h-24' />
      </div>
    )
  },
)
MessageList.displayName = 'MessageList'
