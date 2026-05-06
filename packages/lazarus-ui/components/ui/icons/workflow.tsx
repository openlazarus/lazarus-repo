'use client'

import { useAnimation } from 'motion/react'
import * as m from 'motion/react-m'
import { forwardRef, useCallback, useImperativeHandle, useRef } from 'react'

import { cn } from '@/lib/utils'

import type { Variants } from 'motion/react'
import type { HTMLAttributes } from 'react'

export interface WorkflowIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface WorkflowIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number
}

const DURATION = 0.3

const calculateDelay = (i: number) => {
  if (i === 0) return 0.1

  return i * DURATION + 0.1
}

const circleVariants: Variants = {
  normal: { pathLength: 1, opacity: 1, transition: { delay: 0 } },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
  },
}

const pathVariants: Variants = {
  normal: {
    pathLength: 1,
    pathOffset: 0,
    opacity: 1,
    transition: { delay: 0 },
  },
  animate: {
    pathLength: [0, 1],
    opacity: [0, 1],
    pathOffset: [1, 0],
  },
}

const lineVariants: Variants = {
  normal: { opacity: 1, pathLength: 1, transition: { delay: 0 } },
  animate: {
    opacity: [0, 1],
    pathLength: [0, 1],
  },
}

const WorkflowIcon = forwardRef<WorkflowIconHandle, WorkflowIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation()
    const isControlledRef = useRef(false)

    useImperativeHandle(ref, () => {
      isControlledRef.current = true

      return {
        startAnimation: () => controls.start('animate'),
        stopAnimation: () => controls.start('normal'),
      }
    })

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('animate')
        } else {
          onMouseEnter?.(e)
        }
      },
      [controls, onMouseEnter],
    )

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (!isControlledRef.current) {
          controls.start('normal')
        } else {
          onMouseLeave?.(e)
        }
      },
      [controls, onMouseLeave],
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
            cx='18'
            cy='18'
            r='3'
            transition={{
              duration: DURATION,
              delay: calculateDelay(0),
              opacity: { delay: calculateDelay(0) },
            }}
            variants={circleVariants}
            animate={controls}
          />
          <m.circle
            cx='6'
            cy='6'
            r='3'
            transition={{
              duration: DURATION,
              delay: calculateDelay(2),
              opacity: { delay: calculateDelay(2) },
            }}
            variants={circleVariants}
            animate={controls}
          />
          <m.path
            d='M13 6h3a2 2 0 0 1 2 2v7'
            transition={{
              duration: DURATION,
              delay: calculateDelay(1),
              opacity: { delay: calculateDelay(1) },
            }}
            variants={pathVariants}
            animate={controls}
          />
          <m.line
            x1='6'
            x2='6'
            y1='9'
            y2='21'
            transition={{
              duration: DURATION,
              delay: calculateDelay(3),
              opacity: { delay: calculateDelay(3) },
            }}
            variants={lineVariants}
            animate={controls}
          />
        </svg>
      </div>
    )
  },
)

WorkflowIcon.displayName = 'WorkflowIcon'

export { WorkflowIcon }
