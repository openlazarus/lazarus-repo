'use client'

import * as m from 'motion/react-m'
import { forwardRef } from 'react'

import { CapsuleButton } from '@/components/ui/button/capsule-button'
import { cn } from '@/lib/utils'

interface AskButtonProps {
  onClick: () => void
  onStop?: () => void
  size?: 'small' | 'default'
  variant?: 'mobile' | 'desktop'
  disabled?: boolean
  className?: string
  isSending?: boolean
}

export const AskButton = forwardRef<HTMLButtonElement, AskButtonProps>(
  (
    {
      onClick,
      onStop,
      size = 'default',
      variant = 'desktop',
      disabled = false,
      className = '',
      isSending = false,
    },
    ref,
  ) => {
    // When sending, clicking should stop; otherwise, submit
    const handleClick = isSending && onStop ? onStop : onClick
    // Spring animation values, tuned for an Apple-like feel
    const springTransition = {
      type: 'spring',
      stiffness: 450, // Higher stiffness for snappier response
      damping: 35, // Balanced damping to prevent too much oscillation
      mass: 0.65, // Lower mass for quicker response
    }

    return (
      <m.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={springTransition}
        className={cn(
          disabled && !isSending ? 'opacity-50' : 'opacity-100',
          'transition-opacity duration-200',
        )}
        style={{
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform, opacity',
        }}>
        <CapsuleButton
          onClick={handleClick}
          label={isSending ? 'Stop' : 'Send message'}
          size={size}
          usem={!disabled} // Only use m when enabled
          disabled={disabled && !isSending}
          className={className}
          isSending={isSending}
        />
      </m.div>
    )
  },
)

AskButton.displayName = 'AskButton'
