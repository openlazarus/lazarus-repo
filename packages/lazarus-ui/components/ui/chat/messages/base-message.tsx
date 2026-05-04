'use client'

import * as m from 'motion/react-m'
import { memo, ReactNode, useMemo, useRef, useState } from 'react'

import { CheckIcon, CheckIconHandle } from '@/components/ui/icons/check'
import { CopyIcon, CopyIconHandle } from '@/components/ui/icons/copy'
import { cn } from '@/lib/utils'

import { MessageReactions } from '../reactions/reactions'
import { ChatMessage } from '../types'

// iOS-style message tail CSS
const messageStyles = `
  .message-with-tail {
    position: relative;
    z-index: 1;
  }

  .message-with-tail::before,
  .message-with-tail::after {
    position: absolute;
    bottom: 0;
    height: 20px;
    content: '';
    z-index: -1;
  }

  .message-with-tail::before {
    width: 20px;
  }

  .message-with-tail::after {
    width: 26px;
    background-color: hsl(var(--background-secondary));
  }

  .message-sent::before {
    right: -7px;
    background-color: #33a9fd;
    border-bottom-left-radius: 16px 14px;
  }

  .dark .message-sent::before {
    background-color: #0098FC;
  }

  .message-sent::after {
    right: -26px;
    border-bottom-left-radius: 10px;
  }

  .message-received::before {
    left: -7px;
    background-color: hsl(var(--muted));
    border-bottom-right-radius: 16px 14px;
  }

  .dark .message-received::before {
    background-color: hsl(var(--chat-agent-bg));
  }

  .message-received::after {
    left: -26px;
    border-bottom-right-radius: 10px;
  }

  .message-system::before {
    right: -7px;
    background-color: #dcdcdc;
    border-bottom-left-radius: 16px 14px;
  }

  .dark .message-system::before {
    background-color: hsl(var(--lazarus-gray-700));
  }

  .message-system::after {
    right: -26px;
    border-bottom-left-radius: 10px;
  }
`

export interface BaseMessageProps {
  message: ChatMessage
  children: ReactNode
  isGrouped?: boolean
  isLastInGroup?: boolean
  showTimestamp?: boolean
  onRetry?: (messageId: string) => void
  onReactionClick?: (messageId: string, reaction: any) => void
  onTapbackClick?: (messageId: string, tapback: any) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
  // Override bubble styles
  bubbleClassName?: string
  // Whether to show the bubble wrapper
  showBubble?: boolean
  // Custom wrapper className
  wrapperClassName?: string
  // Override bubble color variant
  bubbleVariant?: 'user' | 'assistant' | 'system'
}

/**
 * BaseMessage - Handles all the common message bubble rendering logic
 *
 * This component provides:
 * - Message bubble with proper styling
 * - Message tails
 * - Animations
 * - Reactions
 * - Retry functionality
 *
 * Child components only need to provide the content
 */
export const BaseMessage = memo<BaseMessageProps>(
  ({
    message,
    children,
    isGrouped = false,
    isLastInGroup = false,
    showTimestamp = false,
    onRetry,
    onReactionClick,
    onTapbackClick,
    className,
    uiVariant = 'desktop',
    bubbleClassName,
    showBubble = true,
    wrapperClassName,
    bubbleVariant,
  }) => {
    const [showCopyFeedback, setShowCopyFeedback] = useState(false)
    const copyIconRef = useRef<CopyIconHandle>(null)
    const checkIconRef = useRef<CheckIconHandle>(null)

    const isUser = message.role === 'user'
    const isAssistant = message.role === 'assistant'
    const hasFailed =
      message.variant.type === 'text' && message.variant.status === 'failed'

    // Determine bubble variant - use override if provided, otherwise use role
    const effectiveBubbleVariant =
      bubbleVariant || (isUser ? 'user' : 'assistant')
    const isUserBubble = effectiveBubbleVariant === 'user'
    const isAssistantBubble = effectiveBubbleVariant === 'assistant'
    const isSystemBubble = effectiveBubbleVariant === 'system'

    // Determine if this message should have a tail
    const hasTail =
      (!isGrouped || isLastInGroup) && !message.forceNoTail && showBubble

    // Check if this is a normal text message from assistant (not action or system)
    const isNormalTextMessage =
      message.variant.type === 'text' &&
      !message.variant.status?.includes('action') &&
      message.role === 'assistant'

    // Handle copy to clipboard
    const handleCopy = async () => {
      if (
        message.variant.type === 'text' &&
        typeof message.variant.content === 'string'
      ) {
        try {
          await navigator.clipboard.writeText(message.variant.content)
          setShowCopyFeedback(true)
          checkIconRef.current?.startAnimation()
          setTimeout(() => {
            setShowCopyFeedback(false)
            checkIconRef.current?.stopAnimation()
          }, 2000)
        } catch (err) {
          console.error('Failed to copy text: ', err)
        }
      }
    }

    // Memoize bubble styles for performance
    const bubbleStyles = useMemo(
      () =>
        cn(
          // Base styles - reduced padding, increased border radius, higher z-index
          'message-bubble relative inline-block px-[10px] py-[8px] max-w-full z-20',
          // Role-specific styles with tail variations
          isUserBubble && [
            'bg-[#33a9fd] text-white dark:bg-[#0098FC] dark:text-white',
            'rounded-[18px]',
            'ml-auto', // Align to right
          ],
          isAssistantBubble && [
            'bg-muted text-foreground dark:bg-chat-agent-bg dark:text-white',
            'rounded-[18px]',
            'mr-auto', // Align to left
          ],
          isSystemBubble && [
            'bg-[#dcdcdc] text-gray-700 dark:bg-gray-700 dark:text-gray-200',
            'rounded-[18px]',
            'ml-auto', // Align to right like user messages
          ],
          // Status styles
          hasFailed && 'opacity-60',
          // Grouping styles - reduced spacing for grouped messages
          isGrouped && !isLastInGroup && 'mb-1',
          // Size adjustments
          'text-[14px] leading-[1.4]',
          // Shadow
          'shadow-[0_1px_0.5px_rgba(0,0,0,0.07)]',

          bubbleClassName,
          className,
        ),
      [
        isUserBubble,
        isAssistantBubble,
        isSystemBubble,
        hasFailed,
        isGrouped,
        isLastInGroup,
        bubbleClassName,
        className,
      ],
    )

    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: messageStyles }} />
        <m.div
          className={cn(
            'message-wrapper flex',
            isUserBubble || isSystemBubble ? 'justify-end' : 'justify-start',
            !isGrouped && 'mb-4',
            wrapperClassName,
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}
          data-message-id={message.id}>
          <div
            className='flex max-w-[90%] flex-col'
            style={{ maxWidth: 'min(90%, 100vw - 3rem)' }}>
            {showBubble ? (
              <div className='relative inline-block max-w-full'>
                <div
                  className={cn(
                    bubbleStyles,
                    // iOS-style tail classes
                    hasTail && 'message-with-tail',
                    hasTail && isUserBubble && 'message-sent',
                    hasTail && isAssistantBubble && 'message-received',
                    hasTail && isSystemBubble && 'message-system',
                  )}>
                  {/* Message content from child component */}
                  <div className='message-content overflow-x-hidden whitespace-pre-line break-words'>
                    {children}
                  </div>

                  {/* Copy button for assistant text messages */}
                  {isNormalTextMessage && (
                    <div className='mt-1 flex justify-end'>
                      <button
                        onClick={handleCopy}
                        onMouseEnter={() => {
                          if (!showCopyFeedback) {
                            copyIconRef.current?.startAnimation()
                          }
                        }}
                        onMouseLeave={() => {
                          if (!showCopyFeedback) {
                            copyIconRef.current?.stopAnimation()
                          }
                        }}
                        className={cn(
                          'flex items-center gap-1 rounded px-1.5 py-0.5 text-xs transition-all duration-200',
                          // Light mode: dark text on light background
                          'text-gray-600 hover:text-gray-800',
                          // Dark mode: light text on dark background
                          'dark:text-white/70 dark:hover:text-white/90',
                        )}
                        aria-label='Copy message'>
                        {showCopyFeedback ? (
                          <CheckIcon ref={checkIconRef} size={12} />
                        ) : (
                          <CopyIcon ref={copyIconRef} size={12} />
                        )}
                        <span className='text-[10px]'>
                          {showCopyFeedback ? 'Copied' : 'Copy'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Status indicator for failed messages */}
                {hasFailed && onRetry && (
                  <button
                    onClick={() => onRetry(message.id)}
                    className='absolute -bottom-6 right-0 z-10 text-xs text-red-500 hover:underline'
                    aria-label='Retry sending message'>
                    <i className='ri-error-warning-line mr-1' />
                    Failed • Retry
                  </button>
                )}
              </div>
            ) : (
              // No bubble wrapper, just render children
              children
            )}

            {/* Reactions - displayed below the message bubble */}
            {((message.reactions && message.reactions.length > 0) ||
              (message.tapbacks && message.tapbacks.length > 0)) && (
              <MessageReactions
                reaction={message.reactions?.[0]?.emoji as any}
                tapbacks={message.tapbacks}
                onReactionClick={(reaction) =>
                  onReactionClick?.(message.id, reaction)
                }
                onTapbackClick={(tapback) =>
                  onTapbackClick?.(message.id, tapback)
                }
                className={cn(isUser ? 'justify-end' : 'justify-start', 'mt-1')}
              />
            )}
          </div>
        </m.div>
      </>
    )
  },
)

BaseMessage.displayName = 'BaseMessage'
