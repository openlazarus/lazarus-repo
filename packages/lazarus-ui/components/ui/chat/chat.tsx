'use client'

import { memo, useMemo } from 'react'

import { useIsMobile } from '@/hooks/ui/layout/use-media-query'
import { cn } from '@/lib/utils'

import { ChatContainer } from './chat-container'
import { MessageList } from './message-list'
import { ChatMessage } from './types'

export interface ChatProps {
  messages?: ChatMessage[]
  isLoading?: boolean
  showTypingIndicator?: boolean
  onMessageVisible?: (messageId: string) => void
  onActionClick?: (messageId: string, actionId: string) => void
  onRevertAction?: (messageId: string) => void
  onReactionClick?: (messageId: string, reaction: any) => void
  onTapbackClick?: (messageId: string, tapback: any) => void
  onTagClick?: (tag: any) => void
  onPermissionRespond?: (
    sessionId: string,
    requestId: string,
    allowed: boolean,
    reason?: string,
  ) => void
  onAskUserQuestionRespond?: (
    sessionId: string,
    requestId: string,
    answers: Record<string, string>,
  ) => void
  className?: string
  containerClassName?: string
}

/**
 * Chat - Main chat component
 *
 * Features:
 * - Clean, minimal interface
 * - Smooth animations and transitions
 * - Intelligent message grouping
 * - Mobile-optimized layout
 * - Performance optimized with memoization
 */
export const Chat = memo<ChatProps>(
  ({
    messages = [],
    isLoading = false,
    showTypingIndicator = false,
    onMessageVisible,
    onActionClick,
    onRevertAction,
    onReactionClick,
    onTapbackClick,
    onTagClick,
    onPermissionRespond,
    onAskUserQuestionRespond,
    className,
    containerClassName,
  }) => {
    const isMobile = useIsMobile()
    const variant = isMobile ? 'mobile' : 'desktop'

    // Ensure all messages have required fields
    const displayMessages = useMemo(() => {
      return messages.map((msg, index) => ({
        ...msg,
        id: msg.id || `msg-${index}`,
        timestamp: msg.timestamp || new Date(),
      }))
    }, [messages])

    return (
      <ChatContainer
        className={cn('chat', containerClassName)}
        variant={variant}>
        <MessageList
          messages={displayMessages}
          isLoading={isLoading}
          showTypingIndicator={showTypingIndicator}
          onMessageVisible={onMessageVisible}
          onActionClick={onActionClick}
          onRevertAction={onRevertAction}
          onReactionClick={onReactionClick}
          onTapbackClick={onTapbackClick}
          onTagClick={onTagClick}
          onPermissionRespond={onPermissionRespond}
          onAskUserQuestionRespond={onAskUserQuestionRespond}
          className={className}
          variant={variant}
        />
      </ChatContainer>
    )
  },
)

Chat.displayName = 'Chat'
