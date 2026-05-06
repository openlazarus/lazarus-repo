'use client'

import { memo } from 'react'

import {
  ActionMessage,
  AskUserQuestionMessage,
  BackgroundActionMessage,
  ErrorMessage,
  ExecutionPlanMessage,
  PermissionActionMessage,
  SelectedActionMessage,
  TagMessage,
  TemplateCardMessage,
  TextMessage,
} from './messages'
import { ChatMessage } from './types'

export interface MessageRendererProps {
  message: ChatMessage
  isGrouped?: boolean
  isLastInGroup?: boolean
  showTimestamp?: boolean
  onRetry?: (messageId: string) => void
  onActionClick?: (messageId: string, actionId: string) => void
  onRevertAction?: (messageId: string) => void
  onTagClick?: (tag: any) => void
  onReactionClick?: (messageId: string, reaction: any) => void
  onTapbackClick?: (messageId: string, tapback: any) => void
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
  variant?: 'mobile' | 'desktop'
}

/**
 * MessageRenderer - Renders different message types based on their variant
 *
 * This component acts as a factory, delegating to the appropriate
 * message component based on the message variant type.
 */
export const MessageRenderer = memo<MessageRendererProps>(
  ({
    message,
    isGrouped,
    isLastInGroup,
    showTimestamp,
    onRetry,
    onActionClick,
    onRevertAction,
    onTagClick,
    onReactionClick,
    onTapbackClick,
    onPermissionRespond,
    onAskUserQuestionRespond,
    className,
    variant = 'desktop',
  }) => {
    // Common props for all message types
    const commonProps = {
      message: message as any,
      className,
      uiVariant: variant,
    }

    // Handle messages without variants (direct content)
    if (!message.variant) {
      // Convert to text message format
      const textMessage = {
        ...message,
        variant: {
          type: 'text' as const,
          content: message.content || '',
        },
      }
      return (
        <TextMessage
          {...commonProps}
          message={textMessage as any}
          isGrouped={isGrouped}
          isLastInGroup={isLastInGroup}
          showTimestamp={showTimestamp}
          onRetry={onRetry}
          onReactionClick={onReactionClick}
          onTapbackClick={onTapbackClick}
        />
      )
    }

    // Render based on message variant
    switch (message.variant.type) {
      case 'text':
        return (
          <TextMessage
            {...commonProps}
            isGrouped={isGrouped}
            isLastInGroup={isLastInGroup}
            showTimestamp={showTimestamp}
            onRetry={onRetry}
            onReactionClick={onReactionClick}
            onTapbackClick={onTapbackClick}
          />
        )

      case 'action':
        return (
          <ActionMessage
            {...commonProps}
            isGrouped={isGrouped}
            isLastInGroup={isLastInGroup}
            onActionClick={onActionClick}
          />
        )

      case 'error':
        return <ErrorMessage {...commonProps} onRetry={onRetry} />

      case 'tag':
        return (
          <TagMessage
            {...commonProps}
            isGrouped={isGrouped}
            isLastInGroup={isLastInGroup}
            onTagClick={onTagClick}
          />
        )

      case 'selected-action':
        return (
          <SelectedActionMessage
            {...commonProps}
            isGrouped={isGrouped}
            isLastInGroup={isLastInGroup}
            onRevert={onRevertAction}
          />
        )

      case 'background-action':
        return <BackgroundActionMessage {...commonProps} />

      case 'execution-plan':
        return <ExecutionPlanMessage {...commonProps} />

      case 'permission':
        return (
          <PermissionActionMessage
            {...commonProps}
            onRespond={onPermissionRespond}
          />
        )

      case 'ask-user-question':
        return (
          <AskUserQuestionMessage
            {...commonProps}
            onRespond={onAskUserQuestionRespond}
          />
        )

      case 'template-card':
        return (
          <TemplateCardMessage
            {...commonProps}
            isGrouped={isGrouped}
            isLastInGroup={isLastInGroup}
            onActionClick={onActionClick}
          />
        )

      default:
        // For any unhandled types, render as text
        return null
    }
  },
)

MessageRenderer.displayName = 'MessageRenderer'
