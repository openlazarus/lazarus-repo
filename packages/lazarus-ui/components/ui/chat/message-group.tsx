'use client'

import { memo } from 'react'

import { cn } from '@/lib/utils'

import { MessageRenderer } from './message-renderer'
import { MessageGroupProps, isTagMessage } from './types'

/**
 * MessageGroup - Groups consecutive messages from the same sender
 *
 * Features:
 * - Visual grouping with reduced spacing
 * - Single timestamp for the group
 * - Sender avatar/name for assistant messages
 * - Optimized rendering with memo
 *
 * Note: With the new variant system, tags are now separate messages
 * rather than properties on messages
 */
export const MessageGroup = memo<MessageGroupProps>(
  ({
    messages,
    role,
    timestamp: _timestamp,
    onReactionClick,
    onTapbackClick,
    onTagClick,
    className,
    variant = 'desktop',
  }) => {
    const isUser = role === 'user'
    const isAssistant = role === 'assistant'

    // Separate tag messages from other messages
    const tagMessages = messages.filter(isTagMessage)
    const nonTagMessages = messages.filter((msg) => !isTagMessage(msg))

    return (
      <div
        className={cn(
          'message-group',
          'space-y-1', // Tight spacing between grouped messages
          className,
        )}>
        {/* Render tag messages first if any */}
        {tagMessages.map((tagMessage) => (
          <MessageRenderer
            key={tagMessage.id}
            message={tagMessage}
            isGrouped={false} // Tags are not grouped
            isLastInGroup={false}
            showTimestamp={false}
            onTagClick={onTagClick}
            variant={variant}
          />
        ))}

        {/* Messages in the group */}
        <div
          className={cn(
            'space-y-1',
            isUser && 'items-end', // Align user messages to the right
          )}>
          {nonTagMessages.map((message, index) => (
            <MessageRenderer
              key={message.id}
              message={message}
              isGrouped={true}
              isLastInGroup={index === nonTagMessages.length - 1}
              showTimestamp={false} // Timestamp shown at group level
              onReactionClick={onReactionClick}
              onTapbackClick={onTapbackClick}
              onTagClick={onTagClick}
              variant={variant}
            />
          ))}
        </div>

        {/* Group timestamp could be shown here if needed */}
      </div>
    )
  },
)

MessageGroup.displayName = 'MessageGroup'
