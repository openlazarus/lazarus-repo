'use client'

import { useAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { cn } from '@/lib/utils'

import type { Variants } from 'motion/react'
import type { HTMLAttributes } from 'react'

// Scoped animation state manager
const animationState = {
  // Track animations by itemId
  animatingItems: new Set<string>(),
  listeners: new Map<string, Set<() => void>>(),

  startAnimation(itemId: string) {
    this.animatingItems.add(itemId)
    this.notifyListeners(itemId)

    // Reset after animation completes
    setTimeout(() => {
      this.animatingItems.delete(itemId)
      this.notifyListeners(itemId)
    }, 700) // Duration of animation + buffer
  },

  registerListener(itemId: string, callback: () => void) {
    if (!this.listeners.has(itemId)) {
      this.listeners.set(itemId, new Set())
    }
    this.listeners.get(itemId)?.add(callback)

    return () => {
      this.listeners.get(itemId)?.delete(callback)
      if (this.listeners.get(itemId)?.size === 0) {
        this.listeners.delete(itemId)
      }
    }
  },

  notifyListeners(itemId: string) {
    this.listeners.get(itemId)?.forEach((callback) => callback())
  },

  isAnimating(itemId: string) {
    return this.animatingItems.has(itemId)
  },
}

export interface CogIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface CogIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
  itemId?: string // Add itemId prop to scope animations
}

const cogVariants: Variants = {
  normal: {
    rotate: 0,
    transition: {
      type: 'spring',
      stiffness: 50,
      damping: 10,
    },
  },
  animate: {
    rotate: 180,
    transition: {
      type: 'spring',
      stiffness: 50,
      damping: 10,
    },
  },
}

// Updated trigger function with itemId parameter
export const triggerCogAnimation = (itemId: string) => {
  animationState.startAnimation(itemId)
}

const CogIcon = forwardRef<CogIconHandle, CogIconProps>(
  (
    { onMouseEnter, onMouseLeave, className, size = 28, itemId = '', ...props },
    ref,
  ) => {
    const controls = useAnimation()
    const isControlledRef = useRef(false)
    const [_isAnimating, setIsAnimating] = useState(
      itemId ? animationState.isAnimating(itemId) : false,
    )

    useEffect(() => {
      if (!itemId) return

      // Listen for animations for this specific itemId
      const unregister = animationState.registerListener(itemId, () => {
        const isCurrentlyAnimating = animationState.isAnimating(itemId)
        setIsAnimating(isCurrentlyAnimating)

        if (isCurrentlyAnimating) {
          controls.start('animate')
        } else {
          controls.start('normal')
        }
      })

      return unregister
    }, [controls, itemId])

    useImperativeHandle(ref, () => {
      isControlledRef.current = true

      return {
        startAnimation: () => {
          if (itemId) {
            // Trigger animation for this specific item
            triggerCogAnimation(itemId)
          } else {
            controls.start('animate')
          }
        },
        stopAnimation: () => controls.start('normal'),
      }
    })

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        // Remove hover animation trigger
        onMouseEnter?.(e)
      },
      [onMouseEnter],
    )

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        // Remove hover animation reset
        onMouseLeave?.(e)
      },
      [onMouseLeave],
    )

    return (
      <div
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}>
        <m.svg
          xmlns='http://www.w3.org/2000/svg'
          width={size}
          height={size}
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
          variants={cogVariants}
          animate={controls}>
          <path d='M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16Z' />
          <path d='M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' />
          <path d='M12 2v2' />
          <path d='M12 22v-2' />
          <path d='m17 20.66-1-1.73' />
          <path d='M11 10.27 7 3.34' />
          <path d='m20.66 17-1.73-1' />
          <path d='m3.34 7 1.73 1' />
          <path d='M14 12h8' />
          <path d='M2 12h2' />
          <path d='m20.66 7-1.73 1' />
          <path d='m3.34 17 1.73-1' />
          <path d='m17 3.34-1 1.73' />
          <path d='m11 13.73-4 6.93' />
        </m.svg>
      </div>
    )
  },
)

CogIcon.displayName = 'CogIcon'

export { CogIcon }
