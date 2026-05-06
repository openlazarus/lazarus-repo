'use client'

import * as m from 'motion/react-m'
import { ReactNode, useState } from 'react'

import { cn } from '@/lib/utils'

export interface StackProps {
  children: ReactNode
  className?: string
  isDark?: boolean
  divider?: boolean
}

/**
 * Stack - A generic vertical stack/list component
 *
 * Used for displaying lists of items in activity, agents, sources, etc.
 * Provides consistent styling, animations, and dividers.
 */
export function Stack({
  children,
  className,
  isDark = false,
  divider = true,
}: StackProps) {
  return (
    <m.div
      className={cn(
        divider && (isDark ? 'divide-white/5' : 'divide-black/5'),
        divider && 'divide-y',
        className,
      )}
      initial='hidden'
      animate='visible'
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.08,
            delayChildren: 0.1,
          },
        },
      }}>
      {children}
    </m.div>
  )
}

export interface StackItemProps {
  children: ReactNode
  className?: string
  isDark?: boolean
  index?: number
  onClick?: () => void
  /** If true, applies the standard card design with hover effects */
  styled?: boolean
}

/**
 * StackItem - Individual item in a stack
 *
 * Provides consistent animation and hover effects.
 * When styled=true, includes the activity card design with hover gradients.
 */
export function StackItem({
  children,
  className,
  isDark = false,
  index = 0,
  onClick,
  styled = false,
}: StackItemProps) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <m.div
      initial={{
        opacity: 0,
        y: 20,
        filter: 'blur(4px)',
      }}
      animate={{
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
      }}
      transition={{
        duration: 0.6,
        delay: index * 0.08,
        ease: [0.32, 0, 0.67, 0],
      }}
      whileHover={
        onClick
          ? {
              scale: 1.01,
              transition: {
                duration: 0.2,
                ease: [0.25, 0.46, 0.45, 0.94],
              },
            }
          : undefined
      }
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        onClick && 'cursor-pointer',
        styled && 'group relative overflow-hidden',
        className,
      )}>
      {/* Hover background effect - only when styled */}
      {styled && (
        <m.div
          className={cn(
            'absolute inset-0 opacity-0',
            isDark
              ? 'bg-gradient-to-r from-white/[0.02] to-white/[0.04]'
              : 'bg-gradient-to-r from-black/[0.01] to-black/[0.02]',
          )}
          animate={{
            opacity: isHovered ? 1 : 0,
          }}
          transition={{
            duration: 0.3,
            ease: [0.25, 0.46, 0.45, 0.94],
          }}
        />
      )}

      {/* Content wrapper - relative positioning for styled items */}
      <div className={cn(styled && 'relative z-10')}>{children}</div>
    </m.div>
  )
}
