'use client'

import * as m from 'motion/react-m'
import { ReactNode, useState } from 'react'

import { cn } from '@/lib/utils'

interface AnimatedListItemProps {
  // Content
  children: ReactNode

  // Click handler
  onClick?: () => void

  // Index for stagger animation
  index: number

  // Styling
  isDark?: boolean
  className?: string
}

/**
 * Reusable animated list item with hover effects and entry animations.
 * Used in activity, agents, and sources list views.
 */
export function AnimatedListItem({
  children,
  onClick,
  index,
  isDark = false,
  className,
}: AnimatedListItemProps) {
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
      whileHover={{
        scale: 1.01,
        transition: {
          duration: 0.2,
          ease: [0.25, 0.46, 0.45, 0.94],
        },
      }}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'group relative overflow-hidden',
        onClick && 'cursor-pointer',
        className,
      )}>
      {/* Hover background effect */}
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

      {/* Content */}
      <div className='relative z-10 transition-all duration-200'>
        {children}
      </div>
    </m.div>
  )
}
