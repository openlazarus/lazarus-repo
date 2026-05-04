import { useCallback, useState } from 'react'

interface UseTwoPanelResizeOptions {
  initialLeftWidth?: number
  minWidth?: number
  maxWidth?: number
}

export function useTwoPanelResize({
  initialLeftWidth = 65,
  minWidth = 30,
  maxWidth = 70,
}: UseTwoPanelResizeOptions = {}) {
  const [leftWidth, setLeftWidth] = useState(initialLeftWidth)
  const [isResizing, setIsResizing] = useState(false)

  const startResize = useCallback(
    (e: React.MouseEvent, containerRef: React.RefObject<HTMLDivElement>) => {
      setIsResizing(true)
      const startX = e.clientX
      const startWidth = leftWidth

      const handleMouseMove = (e: MouseEvent) => {
        if (!containerRef.current) return

        const containerRect = containerRef.current.getBoundingClientRect()
        const deltaX = e.clientX - startX
        const deltaPercent = (deltaX / containerRect.width) * 100

        const newWidth = Math.max(
          minWidth,
          Math.min(maxWidth, startWidth + deltaPercent),
        )
        setLeftWidth(newWidth)
      }

      const handleMouseUp = () => {
        setIsResizing(false)
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    },
    [leftWidth, minWidth, maxWidth],
  )

  return {
    leftWidth,
    rightWidth: 100 - leftWidth,
    isResizing,
    startResize,
  }
}
