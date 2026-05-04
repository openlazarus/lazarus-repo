'use client'

import { memo, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

import { ScrollAnchorProps } from './types'

/**
 * ScrollAnchor - Keeps the chat scrolled to the bottom
 *
 * Features:
 * - Automatic scrolling on new messages
 * - Intersection observer for visibility tracking
 * - Smooth scroll behavior
 * - Performance optimized
 */
export const ScrollAnchor = memo<ScrollAnchorProps>(
  ({ trackVisibility = true, className }) => {
    const anchorRef = useRef<HTMLDivElement>(null)
    const isAtBottomRef = useRef(true)
    const prevScrollHeightRef = useRef(0)

    // Track if user is at the bottom of the chat
    useEffect(() => {
      if (!trackVisibility || !anchorRef.current) return

      const scrollContainer = anchorRef.current.parentElement
      if (!scrollContainer) return

      const handleScroll = () => {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainer
        // Consider "at bottom" if within 100px of the bottom
        isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 100
      }

      scrollContainer.addEventListener('scroll', handleScroll)
      handleScroll() // Check initial state

      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll)
      }
    }, [trackVisibility])

    // Auto-scroll when new content is added
    useEffect(() => {
      if (!anchorRef.current) return

      const scrollContainer = anchorRef.current.parentElement
      if (!scrollContainer) return

      // Check if content height has increased (new message added)
      const currentScrollHeight = scrollContainer.scrollHeight
      const hasNewContent = currentScrollHeight > prevScrollHeightRef.current

      if (hasNewContent && isAtBottomRef.current) {
        // Scroll to bottom smoothly
        anchorRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'end',
          inline: 'nearest',
        })
      }

      prevScrollHeightRef.current = currentScrollHeight
    })

    return (
      <div
        ref={anchorRef}
        className={cn('scroll-anchor h-4 w-full', className)}
        aria-hidden='true'
      />
    )
  },
)

ScrollAnchor.displayName = 'ScrollAnchor'
