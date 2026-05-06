import { useCallback, useEffect, useRef, useState } from 'react'

interface UseHorizontalScrollOptions {
  scrollAmount?: number
  dependencies?: any[]
}

export const useHorizontalScroll = (
  options: UseHorizontalScrollOptions = {},
) => {
  const { scrollAmount = 200, dependencies = [] } = options

  const containerRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  // Check scroll state
  const updateScrollState = useCallback(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    setCanScrollLeft(container.scrollLeft > 0)
    setCanScrollRight(
      container.scrollLeft < container.scrollWidth - container.clientWidth,
    )
  }, [])

  // Update scroll state when dependencies change
  useEffect(() => {
    updateScrollState()

    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', updateScrollState)
      return () => container.removeEventListener('scroll', updateScrollState)
    }
  }, [updateScrollState, ...dependencies])

  // Scroll functions
  const scrollLeft = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' })
    }
  }, [scrollAmount])

  const scrollRight = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }, [scrollAmount])

  return {
    containerRef,
    canScrollLeft,
    canScrollRight,
    scrollLeft,
    scrollRight,
    updateScrollState,
  }
}
