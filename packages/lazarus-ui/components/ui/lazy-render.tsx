'use client'

import * as m from 'motion/react-m'
import { ReactNode, useMemo } from 'react'
import { useInView } from 'react-intersection-observer'

import { cn } from '@/lib/utils'

interface LazyRenderProps {
  children: ReactNode
  /**
   * Placeholder content to show while the component is not in view
   */
  placeholder?: ReactNode
  /**
   * Threshold for when to trigger the visibility change (0-1)
   * @default 0.1
   */
  threshold?: number
  /**
   * Root margin for the intersection observer
   * @default '50px'
   */
  rootMargin?: string
  /**
   * Whether to trigger only once or every time it enters/leaves viewport
   * @default true
   */
  triggerOnce?: boolean
  /**
   * Whether to animate the content when it becomes visible
   * @default true
   */
  animate?: boolean
  /**
   * Custom animation variants for motion.div
   */
  animationVariants?: {
    hidden: Record<string, any>
    visible: Record<string, any>
  }
  /**
   * Delay before rendering content after it becomes visible (in ms)
   * @default 0
   */
  delay?: number
  /**
   * Additional className for the wrapper
   */
  className?: string
  /**
   * Whether to maintain the element's dimensions when not rendered
   * @default false
   */
  preserveHeight?: boolean
  /**
   * Skip lazy rendering and always render content
   * @default false
   */
  skip?: boolean
  /**
   * Callback when visibility changes
   */
  onVisibilityChange?: (inView: boolean) => void
}

const defaultAnimationVariants = {
  hidden: {
    opacity: 0,
    y: 20,
    scale: 0.95,
    filter: 'blur(10px)',
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    filter: 'blur(0px)',
  },
}

/**
 * LazyRender component that renders children only when they come into view
 * Uses Intersection Observer API for efficient viewport detection
 */
const LazyRender = ({
  children,
  placeholder = null,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  animate = true,
  animationVariants = defaultAnimationVariants,
  delay = 0,
  className,
  preserveHeight = false,
  skip = false,
  onVisibilityChange,
}: LazyRenderProps) => {
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce,
    delay,
    onChange: onVisibilityChange,
  })

  const shouldRender = useMemo(() => {
    return skip || inView
  }, [skip, inView])

  const content = useMemo(() => {
    if (!shouldRender) {
      return placeholder
    }

    if (animate) {
      return (
        <m.div
          initial='hidden'
          animate='visible'
          variants={animationVariants}
          transition={{
            duration: 0.6,
            ease: [0.76, 0, 0.24, 1],
            staggerChildren: 0.1,
          }}>
          {children}
        </m.div>
      )
    }

    return children
  }, [shouldRender, placeholder, animate, animationVariants, children])

  if (preserveHeight && !shouldRender) {
    return (
      <div
        ref={ref}
        className={cn(
          'flex min-h-[200px] items-center justify-center',
          className,
        )}>
        {content}
      </div>
    )
  }

  return (
    <div ref={ref} className={cn('w-full', className)}>
      {content}
    </div>
  )
}

export default LazyRender

// Export types for external use
export type { LazyRenderProps }
