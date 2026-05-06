import { useCallback, useEffect, useRef, useState } from 'react'

import { ColumnWidths, ResizeHandle } from '@/app/(main)/activity/types'
import { LAYOUT } from '@/lib/design-system/ui-constants'

export const useResizableColumns = (initialWidths: ColumnWidths) => {
  const [columnWidths, setColumnWidths] = useState(initialWidths)
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle>({
    isDragging: false,
    startX: 0,
    startWidth: 0,
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeHandle.isDragging || !containerRef.current) return

      const containerRect = containerRef.current.getBoundingClientRect()
      const deltaX = e.clientX - resizeHandle.startX
      const deltaPercent = (deltaX / containerRect.width) * 100

      setColumnWidths((prev) => {
        if (resizeHandle.isDragging === 'left') {
          const newWidth = Math.max(
            LAYOUT.columnWidth.min,
            Math.min(
              LAYOUT.columnWidth.max,
              resizeHandle.startWidth + deltaPercent,
            ),
          )
          return { ...prev, left: newWidth }
        } else if (resizeHandle.isDragging === 'editor') {
          // For editor resize, we need to adjust both left and editor to maintain 100% total
          const newEditorWidth = Math.max(
            LAYOUT.columnWidth.min,
            Math.min(
              LAYOUT.columnWidth.max,
              resizeHandle.startWidth + deltaPercent,
            ),
          )
          const newLeftWidth = Math.max(
            LAYOUT.columnWidth.min,
            Math.min(LAYOUT.columnWidth.max, 100 - newEditorWidth - prev.right),
          )
          return {
            ...prev,
            left: newLeftWidth,
            editor: newEditorWidth,
          }
        } else {
          // For right column, dragging left makes it larger, dragging right makes it smaller
          const newWidth = Math.max(
            LAYOUT.columnWidth.min,
            Math.min(
              LAYOUT.columnWidth.max,
              resizeHandle.startWidth - deltaPercent,
            ),
          )
          return { ...prev, right: newWidth }
        }
      })
    }

    const handleMouseUp = () => {
      setResizeHandle((prev) => ({ ...prev, isDragging: false }))
    }

    if (resizeHandle.isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
      }
    }
  }, [resizeHandle])

  const startResize = useCallback(
    (side: 'left' | 'editor' | 'right', e: React.MouseEvent) => {
      setResizeHandle({
        isDragging: side,
        startX: e.clientX,
        startWidth:
          side === 'left'
            ? columnWidths.left
            : side === 'editor'
              ? columnWidths.editor
              : columnWidths.right,
      })
    },
    [columnWidths],
  )

  return {
    columnWidths,
    containerRef,
    startResize,
    isResizing: resizeHandle.isDragging,
  }
}
