'use client'

import { forwardRef, memo } from 'react'

import { cn } from '@/lib/utils'

import { ChatContainerProps } from './types'

/**
 * ChatContainer - The main container for the chat interface
 *
 * Features:
 * - Responsive padding that adapts to mobile/desktop
 * - Optimized for performance with memo
 * - Proper scroll containment for smooth scrolling
 * - Safe area insets for mobile devices
 */
export const ChatContainer = memo(
  forwardRef<HTMLDivElement, ChatContainerProps>(
    ({ className, children, variant: _variant = 'desktop' }, ref) => {
      return (
        <div
          ref={ref}
          className={cn(
            'chat-container relative flex h-full w-full flex-col overflow-hidden',
            className,
          )}>
          {children}
        </div>
      )
    },
  ),
)

ChatContainer.displayName = 'ChatContainer'
