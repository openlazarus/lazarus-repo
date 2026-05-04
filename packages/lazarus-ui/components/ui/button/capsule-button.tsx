import * as m from 'motion/react-m'
import React, { CSSProperties, useState } from 'react'
import 'remixicon/fonts/remixicon.css'

import { cn } from '@/lib/utils'

interface CapsuleButtonProps {
  onClick: () => void
  label?: string
  disabled?: boolean
  size?: 'small' | 'default'
  className?: string
  usem?: boolean
  isSending?: boolean
}

/**
 * CapsuleButton - A specialized button for the "Think" action
 *
 * @param onClick - Function to call when button is clicked
 * @param label - Accessibility label for the button
 * @param disabled - Whether the button is disabled
 * @param size - Button size
 * @param className - Additional class names
 * @param usem - Whether to use m animations (for mobile)
 */
export const CapsuleButton: React.FC<CapsuleButtonProps> = ({
  onClick,
  label = 'Send message',
  disabled = false,
  size = 'default',
  className = '',
  usem = false,
  isSending = false,
}) => {
  const isSmall = size === 'small'

  // Base class names
  const baseClassNames = cn(
    'group relative flex items-center justify-center overflow-hidden',
    disabled ? 'bg-[#0098FC]/40 shadow-none cursor-default' : '',
    isSmall ? 'h-8' : 'h-9',
    'rounded-full',
    isSmall ? 'px-2' : 'px-2.5',
    className,
  )

  // Animation styles for different approaches (m or CSS)
  const mProps =
    usem && !disabled
      ? {
          whileTap: { scale: 0.94 },
          transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
        }
      : {}

  const nonmStyles: CSSProperties = !usem
    ? {
        transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        willChange: 'transform',
        backfaceVisibility: 'hidden' as const,
      }
    : {}

  // Add background gradient style for enabled buttons
  const buttonStyle: CSSProperties = disabled
    ? {}
    : isSending
      ? { background: 'linear-gradient(to bottom, #ff5c5c, #e53e3e)' }
      : { background: 'linear-gradient(to bottom, #33a9fd, #0098fc)' }

  // Stateful hover/press handling for desktop - moved to top level to avoid conditional hooks
  const [isPressed, setIsPressed] = useState(false)

  // Content rendering
  const renderContent = () => (
    <div
      className='relative z-10 flex items-center justify-center gap-1'
      style={{
        opacity: 1,
        transform: 'scale(1)',
        transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
      {isSending ? (
        <i
          className={`ri-stop-fill ${isSmall ? 'text-[14px]' : 'text-[16px]'} leading-none text-white`}
        />
      ) : (
        <i
          className={`ri-global-line ${isSmall ? 'text-[14px]' : 'text-[16px]'} leading-none text-white`}
          style={{
            animation: disabled ? 'none' : 'rotate 5s ease-in-out infinite',
            animationDelay: '3s',
          }}>
          <style jsx>{`
            @keyframes rotate {
              0%,
              40%,
              100% {
                transform: rotate(0deg);
              }
              45%,
              55% {
                transform: rotate(10deg);
              }
              60% {
                transform: rotate(0deg);
              }
            }
          `}</style>
        </i>
      )}
      <span
        className={`${isSmall ? 'text-[12px]' : 'text-[13px]'} font-semibold text-white`}>
        {isSending ? 'Stop' : 'Ask'}
      </span>
    </div>
  )

  // Use m for animation in mobile mode
  if (usem) {
    return (
      <m.button
        {...mProps}
        onClick={(e) => {
          if (!disabled) {
            e.stopPropagation()
            onClick()
          }
        }}
        disabled={disabled}
        className={baseClassNames}
        style={{
          willChange: 'transform',
          transform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          ...buttonStyle,
        }}
        aria-label={label}>
        <m.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{
            opacity: 1,
            scale: 1,
            transition: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
          }}
          exit={{
            opacity: 0,
            scale: 0.8,
            transition: { duration: 0.15, ease: [0.32, 0.72, 0, 1] },
          }}
          className='relative z-10 flex items-center justify-center gap-1'>
          {renderContent()}
        </m.div>
      </m.button>
    )
  }

  // Standard version (for desktop)
  return (
    <button
      onMouseDown={() => !disabled && setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onClick={(e) => {
        if (!disabled) {
          e.stopPropagation()
          onClick()
        }
      }}
      disabled={disabled}
      className={baseClassNames}
      style={{
        transform: disabled ? 'scale(1)' : `scale(${isPressed ? 0.94 : 1})`,
        ...nonmStyles,
        ...buttonStyle,
      }}
      aria-label={label}>
      {renderContent()}
    </button>
  )
}
