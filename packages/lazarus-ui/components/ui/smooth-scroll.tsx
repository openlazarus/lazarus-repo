'use client'

import { ReactLenis } from 'lenis/react'
import {
  forwardRef,
  ReactNode,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

type Orientation = 'vertical' | 'horizontal'

export interface SmoothScrollProps {
  children: ReactNode
  className?: string
  /**
   * Whether to use Lenis as the root scroller
   */
  root?: boolean
  /**
   * Whether to enable smooth scrolling (set to false for normal scrolling behavior)
   */
  enabled?: boolean
  /**
   * Whether to enable the bounce effect at the top and bottom
   */
  enableBounce?: boolean
  /**
   * Callback for scroll events
   */
  onScroll?: (scrollInfo: {
    scroll: number
    limit: number
    velocity: number
    direction: number
    progress: number
  }) => void

  /**
   * Options for Lenis scroll behavior
   */
  options?: {
    duration?: number
    easing?: (t: number) => number
    wheelMultiplier?: number
    touchMultiplier?: number
    infinite?: boolean
    orientation?: Orientation
    gestureOrientation?: Orientation
    smoothWheel?: boolean
    smoothTouch?: boolean
    touchInertiaMultiplier?: number
    syncTouch?: boolean
    syncTouchLerp?: number
  }
}

export interface SmoothScrollRef {
  scrollTo: (
    target: HTMLElement | number | string,
    options?: {
      offset?: number
      immediate?: boolean
      lock?: boolean
      duration?: number
      easing?: (t: number) => number
    },
  ) => void
  stop: () => void
  start: () => void
}

/**
 * A flexible smooth scroll component using Lenis with bounce effect
 */
export const SmoothScroll = forwardRef<SmoothScrollRef, SmoothScrollProps>(
  (
    {
      children,
      className = '',
      root = false,
      enabled = true,
      enableBounce = true,
      onScroll,

      options = {},
    },
    ref,
  ) => {
    // Using an explicitly typed ref to avoid type errors
    const lenisRef = useRef<any>(null)

    // Set up onScroll handler when lenisRef or onScroll changes
    useEffect(() => {
      if (lenisRef.current?.lenis && onScroll) {
        // Add scroll event listener
        const unsubscribe = lenisRef.current.lenis.on('scroll', onScroll)

        // Clean up on unmount
        return () => {
          if (unsubscribe) unsubscribe()
        }
      }
    }, [onScroll])

    // Expose methods and refs through the forwarded ref
    useImperativeHandle(ref, () => ({
      scrollTo: (target, options = {}) => {
        if (lenisRef.current?.lenis) {
          lenisRef.current.lenis.scrollTo(target, options)
        }
      },
      stop: () => {
        if (lenisRef.current?.lenis) {
          lenisRef.current.lenis.stop()
        }
      },
      start: () => {
        if (lenisRef.current?.lenis) {
          lenisRef.current.lenis.start()
        }
      },
    }))

    // Default options for smooth scroll behavior
    const defaultOptions = {
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      wheelMultiplier: 1,
      touchMultiplier: 2,
      orientation: 'vertical' as Orientation,
      smoothWheel: enabled,
      smoothTouch: enabled,
      syncTouch: true,
      touchInertiaMultiplier: enableBounce ? 45 : 35, // Increased for more bounce
    }

    // Combine default options with passed options
    const lenisOptions = {
      ...defaultOptions,
      ...options,
    }

    return (
      <ReactLenis
        ref={lenisRef}
        root={root}
        className={className}
        options={lenisOptions}>
        <style jsx global>{`
          html {
            scroll-behavior: initial;
          }

          .lenis {
            height: 100%;
            width: 100%;
            overflow-y: auto;
          }

          .lenis.lenis-smooth {
            scroll-behavior: auto;
          }

          .lenis.lenis-smooth [data-lenis-prevent] {
            overscroll-behavior: contain;
          }

          .lenis.lenis-stopped {
            overflow: hidden;
          }

          .lenis.lenis-scrolling iframe {
            pointer-events: none;
          }
        `}</style>
        {children}
      </ReactLenis>
    )
  },
)

SmoothScroll.displayName = 'SmoothScroll'
