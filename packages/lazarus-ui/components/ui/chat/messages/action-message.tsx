'use client'

import * as m from 'motion/react-m'
import { memo, useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

import { ChatMessage, MessageAction } from '../types'
import { BaseMessage } from './base-message'

export interface ActionMessageProps {
  message: ChatMessage & {
    variant: {
      type: 'action'
      actions: MessageAction[]
      selectedActionId?: string | null
    }
  }
  onActionClick?: (messageId: string, actionId: string) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
  isGrouped?: boolean
  isLastInGroup?: boolean
}

/**
 * ActionMessage - Displays actions in a message bubble format
 * Uses BaseMessage for all bubble styling and tail rendering
 */
export const ActionMessage = memo<ActionMessageProps>(
  ({
    message,
    onActionClick,
    className,
    uiVariant = 'desktop',
    isGrouped,
    isLastInGroup,
  }) => {
    // Use selectedActionId from message variant if available, otherwise use local state
    const [localSelectedActionId, setLocalSelectedActionId] = useState<
      string | null
    >(null)
    const selectedActionId =
      message.variant.selectedActionId !== undefined
        ? message.variant.selectedActionId
        : localSelectedActionId

    // Reset local state if variant's selectedActionId changes
    useEffect(() => {
      if (message.variant.selectedActionId !== undefined) {
        setLocalSelectedActionId(message.variant.selectedActionId)
      }
    }, [message.variant.selectedActionId])

    const handleClick = useCallback(
      (actionId: string) => {
        setLocalSelectedActionId(actionId)
        onActionClick?.(message.id, actionId)
      },
      [onActionClick, message.id],
    )

    const actions = message.variant.actions
    const selectedAction = actions.find(
      (action) => action.id === selectedActionId,
    )

    // If an action is selected, show the transformed state
    if (selectedActionId && selectedAction) {
      return (
        <BaseMessage
          message={message}
          className={className}
          uiVariant={uiVariant}
          isGrouped={isGrouped}
          isLastInGroup={isLastInGroup}>
          <div className='flex items-center gap-2 text-gray-600 dark:text-gray-400'>
            <i className='ri-list-check text-[16px]' />
            <span className='text-[13px] font-medium'>Option selected</span>
          </div>
        </BaseMessage>
      )
    }

    // Show action options
    return (
      <BaseMessage
        message={message}
        showBubble={true}
        className={className}
        uiVariant={uiVariant}
        isGrouped={isGrouped}
        isLastInGroup={isLastInGroup}>
        <div className='space-y-1.5'>
          {actions.map((action, index) => (
            <m.button
              key={action.id}
              onClick={() => handleClick(action.id)}
              className={cn(
                'action-row w-full rounded-lg px-3 py-2.5',
                'text-left text-[15px] transition-colors duration-200',
                'text-[#0098FC] hover:text-[#0077CC]',
                'dark:text-[#4DB8FF] dark:hover:text-[#80CCFF]',
                'hover:bg-gray-100/50 dark:hover:bg-white/10',
              )}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{
                scale: 0.96,
                transition: {
                  type: 'spring',
                  stiffness: 400,
                  damping: 40,
                  mass: 0.8,
                },
              }}
              transition={{
                y: {
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                  mass: 0.8,
                  delay: index * 0.02,
                },
              }}>
              {action.label}
            </m.button>
          ))}
        </div>
      </BaseMessage>
    )
  },
)

ActionMessage.displayName = 'ActionMessage'
