import { useRef, useState } from 'react'

import { useAppEvents } from '@/hooks/core/use-app-events'

type FileDragEvents = {
  dragenter: DragEvent
  dragleave: DragEvent
  dragover: DragEvent
  drop: DragEvent
}

/**
 * Detects when files are being dragged anywhere on the page.
 * Uses useAppEvents with capture so it fires before element handlers.
 */
export function useFileDragging(): boolean {
  const [isDragging, setIsDragging] = useState(false)
  const dragCounter = useRef(0)

  useAppEvents<FileDragEvents>(
    {
      dragenter: (e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          dragCounter.current++
          if (dragCounter.current === 1) setIsDragging(true)
        }
      },
      dragleave: () => {
        dragCounter.current--
        if (dragCounter.current === 0) setIsDragging(false)
      },
      dragover: (e) => {
        if (e.dataTransfer?.types?.includes('Files')) {
          e.preventDefault()
        }
      },
      drop: (e) => {
        e.preventDefault()
        dragCounter.current = 0
        setIsDragging(false)
      },
    },
    { capture: true },
  )

  return isDragging
}
