'use client'

import { memo } from 'react'

import { ChatMessage } from '../types'
import { BaseMessage } from './base-message'

export interface ErrorMessageProps {
  message: ChatMessage & {
    variant: { type: 'error'; content: string; retryable: boolean }
  }
  onRetry?: (messageId: string) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
}

/**
 * ErrorMessage - Displays error messages in the chat
 * Uses BaseMessage for all bubble rendering logic
 */
export const ErrorMessage = memo<ErrorMessageProps>((props) => {
  const { message, onRetry } = props
  const { content, retryable } = message.variant

  return (
    <BaseMessage {...props} bubbleClassName='opacity-60'>
      <div className='message-content whitespace-pre-line break-words'>
        {content}
      </div>

      {/* Retry button below message - outside bubble */}
      {retryable && onRetry && (
        <button
          onClick={() => onRetry(message.id)}
          className='mt-1 text-left text-xs text-red-500 hover:underline'>
          <i className='ri-error-warning-line mr-1' />
          Failed • Retry
        </button>
      )}
    </BaseMessage>
  )
})

ErrorMessage.displayName = 'ErrorMessage'
