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

export interface GripIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface GripIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
  itemId?: string // Add itemId prop to scope animations
}

const CIRCLES = [
  { cx: 19, cy: 5 }, // Top right
  { cx: 12, cy: 5 }, // Top middle
  { cx: 19, cy: 12 }, // Middle right
  { cx: 5, cy: 5 }, // Top left
  { cx: 12, cy: 12 }, // Center
  { cx: 19, cy: 19 }, // Bottom right
  { cx: 5, cy: 12 }, // Middle left
  { cx: 12, cy: 19 }, // Bottom middle
  { cx: 5, cy: 19 }, // Bottom left
]

const circleVariants: Variants = {
  normal: {
    opacity: 1,
    transition: {
      duration: 0.2,
    },
  },
  animate: {
    opacity: [1, 0.3, 1],
    transition: {
      duration: 0.4,
      times: [0, 0.5, 1],
    },
  },
}

// Updated trigger function with itemId parameter
export const triggerGripAnimation = (itemId: string) => {
  animationState.startAnimation(itemId)
}

const GripIcon = forwardRef<GripIconHandle, GripIconProps>(
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
            triggerGripAnimation(itemId)
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
          {CIRCLES.map((circle, index) => (
            <m.circle
              key={`${circle.cx}-${circle.cy}`}
              variants={circleVariants}
              animate={controls}
              cx={circle.cx}
              cy={circle.cy}
              r='1'
              custom={index}
            />
          ))}
        </svg>
      </div>
    )
  },
)

GripIcon.displayName = 'GripIcon'

export { GripIcon }
