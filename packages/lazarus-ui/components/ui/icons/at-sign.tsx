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

export interface AtSignIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface AtSignIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
  itemId?: string // Add itemId prop to scope animations
}

const circleVariants: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    pathOffset: 0,
    transition: {
      duration: 0.4,
      opacity: { duration: 0.1 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    pathOffset: [1, 0],
    transition: {
      duration: 0.3,
      opacity: { duration: 0.1 },
    },
  },
}

const pathVariants: Variants = {
  normal: {
    opacity: 1,
    pathLength: 1,
    transition: {
      delay: 0.3,
      duration: 0.3,
      opacity: { duration: 0.1, delay: 0.3 },
    },
  },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
    transition: {
      delay: 0.3,
      duration: 0.3,
      opacity: { duration: 0.1, delay: 0.3 },
    },
  },
}

// Updated trigger function with itemId parameter
export const triggerAtSignAnimation = (itemId: string) => {
  animationState.startAnimation(itemId)
}

const AtSignIcon = forwardRef<AtSignIconHandle, AtSignIconProps>(
  (
    { onMouseEnter, onMouseLeave, className, size = 28, itemId = '', ...props },
    ref,
  ) => {
    const controls = useAnimation()
    const isControlledRef = useRef(false)
    const isMountedRef = useRef(false)
    const [_isAnimating, setIsAnimating] = useState(
      itemId ? animationState.isAnimating(itemId) : false,
    )

    // Track mount state
    useEffect(() => {
      isMountedRef.current = true
      return () => {
        isMountedRef.current = false
      }
    }, [])

    useEffect(() => {
      if (!itemId) return

      // Listen for animations for this specific itemId
      const unregister = animationState.registerListener(itemId, () => {
        const isCurrentlyAnimating = animationState.isAnimating(itemId)
        setIsAnimating(isCurrentlyAnimating)

        // Only call controls.start() after component has mounted
        if (!isMountedRef.current) return

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
            triggerAtSignAnimation(itemId)
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
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width={size}
          height={size}
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'>
          <m.circle
            variants={circleVariants}
            animate={controls}
            cx='12'
            cy='12'
            r='4'
          />
          <m.path
            variants={pathVariants}
            animate={controls}
            d='M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8'
          />
        </svg>
      </div>
    )
  },
)

AtSignIcon.displayName = 'AtSignIcon'

export { AtSignIcon }
