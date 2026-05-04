'use client'

import { memo } from 'react'

import { cn } from '@/lib/utils'

import { ReactionType, TapbackType } from '../types'
import {
  AcceptReaction as BaseAcceptReaction,
  ReactionBubble as BaseReactionBubble,
  RejectReaction as BaseRejectReaction,
  Tapback as BaseTapback,
} from './base-reactions'

// Re-export the base components
export {
  AcceptReaction,
  ReactionBubble,
  RejectReaction,
  Tapback,
} from './base-reactions'

// Message reaction wrapper component
export interface MessageReactionsProps {
  reaction?: ReactionType
  tapbacks?: Array<{
    id: string
    type: TapbackType
    userId: string
    timestamp: Date
  }>
  onReactionClick?: (reaction: ReactionType) => void
  onTapbackClick?: (tapback: TapbackType) => void
  className?: string
}

/**
 * MessageReactions - Displays reactions for a message
 *
 * Features:
 * - Accept/Reject reaction bubbles
 * - Tapback emoji reactions
 * - Click handlers for adding/removing reactions
 */
export const MessageReactions = memo<MessageReactionsProps>(
  ({ reaction, tapbacks = [], onReactionClick, onTapbackClick, className }) => {
    // Don't render if no reactions
    if (!reaction && tapbacks.length === 0) {
      return null
    }

    return (
      <div
        className={cn(
          'message-reactions mt-2 flex items-center gap-2',
          className,
        )}>
        {/* Accept/Reject reaction bubble */}
        {reaction && (
          <div
            onClick={() => onReactionClick?.(reaction)}
            className='cursor-pointer'>
            <BaseReactionBubble reaction={reaction} />
          </div>
        )}

        {/* Tapback reactions */}
        {tapbacks.length > 0 && (
          <div className='flex items-center gap-1'>
            {tapbacks.map((tapback) => (
              <div
                key={tapback.id}
                onClick={() => onTapbackClick?.(tapback.type)}
                className='cursor-pointer'>
                <BaseTapback type={tapback.type} />
              </div>
            ))}
          </div>
        )}
      </div>
    )
  },
)

MessageReactions.displayName = 'MessageReactions'

// Reaction selector component for adding reactions
export interface ReactionSelectorProps {
  onReactionSelect: (reaction: ReactionType) => void
  onTapbackSelect: (tapback: TapbackType) => void
  className?: string
}

export const ReactionSelector = memo<ReactionSelectorProps>(
  ({ onReactionSelect, onTapbackSelect, className }) => {
    const tapbackOptions: TapbackType[] = [
      'thumbsUp',
      'thumbsDown',
      'heart',
      'haha',
      'exclamation',
      'question',
    ]

    return (
      <div
        className={cn(
          'reaction-selector flex items-center gap-2 p-2',
          'rounded-full bg-white/90 shadow-lg backdrop-blur-sm',
          'border border-gray-200',
          className,
        )}>
        {/* Accept/Reject buttons */}
        <button
          onClick={() => onReactionSelect('accept')}
          className='rounded-full p-1.5 transition-colors hover:bg-gray-100'
          aria-label='Accept'>
          <BaseAcceptReaction />
        </button>
        <button
          onClick={() => onReactionSelect('reject')}
          className='rounded-full p-1.5 transition-colors hover:bg-gray-100'
          aria-label='Reject'>
          <BaseRejectReaction />
        </button>

        <div className='mx-1 h-6 w-px bg-gray-300' />

        {/* Tapback options */}
        {tapbackOptions.map((type) => (
          <button
            key={type}
            onClick={() => onTapbackSelect(type)}
            className='rounded-full p-1 transition-colors hover:bg-gray-100'
            aria-label={type}>
            <BaseTapback type={type} />
          </button>
        ))}
      </div>
    )
  },
)

ReactionSelector.displayName = 'ReactionSelector'
