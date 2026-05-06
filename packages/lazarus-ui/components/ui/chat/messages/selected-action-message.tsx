'use client'

import { memo } from 'react'

import { ChatMessage } from '../types'
import { BaseMessage } from './base-message'

export interface SelectedActionMessageProps {
  message: ChatMessage & {
    variant: {
      type: 'selected-action'
      actionLabel: string
      originalMessageId: string
    }
  }
  onRevert?: (messageId: string) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
  isGrouped?: boolean
  isLastInGroup?: boolean
}

/**
 * SelectedActionMessage - Shows the selected action as a user message with revert option
 * Uses BaseMessage for all bubble rendering logic and includes the revert UI within the bubble
 */
export const SelectedActionMessage = memo<SelectedActionMessageProps>(
  ({ message, onRevert, uiVariant = 'desktop', ...props }) => {
    const { actionLabel } = message.variant

    return (
      <BaseMessage message={message} uiVariant={uiVariant} {...props}>
        <div className='flex flex-col gap-1'>
          <div className='flex items-center gap-1'>
            <i className='ri-checkbox-circle-line text-[16px] text-white' />
            <span className='font-medium text-white'>{actionLabel}</span>
          </div>
          <div className='flex items-center gap-1.5 text-[11px] text-white/70'>
            <span className='font-medium'>Selected option</span>
            <span>•</span>
            <button
              onClick={() => onRevert?.(message.id)}
              className='flex items-center gap-1 font-medium text-white underline-offset-2 hover:text-white/90 hover:underline'>
              <span>Revert</span>
              <i className='ri-arrow-go-back-line text-[10px]' />
            </button>
          </div>
        </div>
      </BaseMessage>
    )
  },
)

SelectedActionMessage.displayName = 'SelectedActionMessage'
