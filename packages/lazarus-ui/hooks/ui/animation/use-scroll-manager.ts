import { useEffect, useRef } from 'react'

interface ScrollManagerOptions {
  scrollDelay?: number
  smooth?: boolean
  onScrollComplete?: () => void
  dependencies?: any[]
  observeResize?: boolean
  scrollOnMount?: boolean
  bottomPadding?: number
}

export const useScrollManager = (
  containerRef: React.RefObject<HTMLElement>,
  options: ScrollManagerOptions = {},
) => {
  const {
    scrollDelay = 400,
    smooth = true,
    onScrollComplete,
    dependencies = [],
    observeResize = true,
    scrollOnMount = true,
    bottomPadding = 16,
  } = options

  const isFirstRender = useRef(true)
  const scrollTimeoutRef = useRef<NodeJS.Timeout>()
  const observerRef = useRef<ResizeObserver>()

  const scrollToBottom = (container: HTMLElement) => {
    if (!container) return

    container.scrollTop = container.scrollHeight

    requestAnimationFrame(() => {
      if (smooth) {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth',
        })
      } else {
        container.scrollTop = container.scrollHeight
      }
      onScrollComplete?.()
    })
  }

  // Handle scroll on content changes
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }

    const handleScroll = () => {
      // Force immediate scroll on first render
      if (isFirstRender.current && scrollOnMount) {
        container.scrollTop = container.scrollHeight
        isFirstRender.current = false
        return
      }

      scrollTimeoutRef.current = setTimeout(() => {
        scrollToBottom(container)
      }, scrollDelay)
    }

    handleScroll()

    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current)
      }
    }
  }, [...dependencies])

  // Handle resize observations
  useEffect(() => {
    const container = containerRef.current
    if (!container || !observeResize) return

    observerRef.current = new ResizeObserver(() => {
      requestAnimationFrame(() => {
        scrollToBottom(container)
      })
    })

    observerRef.current.observe(container)

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect()
      }
    }
  }, [observeResize])

  return {
    scrollToBottom: () => {
      const container = containerRef.current
      if (container) {
        scrollToBottom(container)
      }
    },
    isFirstRender: isFirstRender.current,
  }
}
