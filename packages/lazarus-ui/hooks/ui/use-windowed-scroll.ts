import { useCallback, useEffect, useRef, useState } from 'react'

interface UseWindowedScrollOptions {
  /** Total number of items in the list */
  totalItems: number
  /** Number of items visible at once */
  visibleItems: number
  /** Index to auto-position to on first render */
  focusIndex: number
  /** Number of items to scroll per step (default 4) */
  scrollStep?: number
}

/**
 * Reusable hook for managing a sliding visible window over a list.
 * Auto-positions on mount so `focusIndex` is near the right edge.
 *
 * Works for any scrollable grid: timelines, heatmaps, carousels, etc.
 */
export function useWindowedScroll({
  totalItems,
  visibleItems,
  focusIndex,
  scrollStep = 4,
}: UseWindowedScrollOptions) {
  const initializedRef = useRef(false)
  const [scrollOffset, setScrollOffset] = useState(0)

  // Auto-position to show focusIndex on first meaningful render
  useEffect(() => {
    if (
      initializedRef.current ||
      totalItems === 0 ||
      visibleItems >= totalItems
    )
      return

    const buffer = Math.min(2, visibleItems - 1)
    const offset = Math.max(
      0,
      Math.min(totalItems - visibleItems, totalItems - focusIndex - buffer),
    )
    setScrollOffset(offset)
    initializedRef.current = true
  }, [totalItems, visibleItems, focusIndex])

  const canScrollLeft = scrollOffset < totalItems - visibleItems
  const canScrollRight = scrollOffset > 0

  const scrollLeft = useCallback(() => {
    setScrollOffset((prev) =>
      Math.min(prev + scrollStep, totalItems - visibleItems),
    )
  }, [scrollStep, totalItems, visibleItems])

  const scrollRight = useCallback(() => {
    setScrollOffset((prev) => Math.max(prev - scrollStep, 0))
  }, [scrollStep])

  const startIndex = Math.max(0, totalItems - visibleItems - scrollOffset)

  return {
    scrollOffset,
    setScrollOffset,
    startIndex,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
  }
}
