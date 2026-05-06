import { useCallback, useRef, useState } from 'react'

type UseDropZoneOptions = {
  onFilesDropped: (files: File[]) => void
  disabled?: boolean
}

type UseDropZoneReturn = {
  isDraggingOver: boolean
  dropZoneProps: {
    onDragEnter: (e: React.DragEvent) => void
    onDragLeave: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
  }
}

export function useDropZone({
  onFilesDropped,
  disabled = false,
}: UseDropZoneOptions): UseDropZoneReturn {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const dragCounter = useRef(0)

  const onDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault()
        dragCounter.current++
        setIsDraggingOver(true)
      }
    },
    [disabled],
  )

  const onDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      dragCounter.current--
      if (dragCounter.current === 0) {
        setIsDraggingOver(false)
      }
    },
    [disabled],
  )

  const onDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
    },
    [disabled],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      dragCounter.current = 0
      setIsDraggingOver(false)
      const files = Array.from(e.dataTransfer.files)
      if (files.length > 0) {
        onFilesDropped(files)
      }
    },
    [disabled, onFilesDropped],
  )

  return {
    isDraggingOver,
    dropZoneProps: { onDragEnter, onDragLeave, onDragOver, onDrop },
  }
}
