'use client'

import { useCallback, useEffect, useState } from 'react'

export type Attachment = {
  id: string
  name: string
  type: 'image' | 'file'
  file: File
  preview?: string
  size: number
}

type UseAttachmentsProps = {
  onAttachmentsChange?: (attachments: Attachment[]) => void
  maxFiles?: number
  maxSize?: number // in bytes
}

export const useAttachments = ({
  onAttachmentsChange = () => {},
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB default
}: UseAttachmentsProps = {}) => {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [error, setError] = useState<string>('')

  // Notify about attachment changes
  useEffect(() => {
    onAttachmentsChange(attachments)
  }, [attachments, onAttachmentsChange])

  // Add a new attachment
  const addAttachment = useCallback((attachment: Attachment) => {
    setAttachments((prev) => [...prev, attachment])
  }, [])

  // Remove an attachment by ID
  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id)
      // Clean up object URL if it exists
      if (attachment?.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
      return prev.filter((attachment) => attachment.id !== id)
    })
  }, [])

  // Clear all attachments
  const clearAttachments = useCallback(() => {
    // Clean up all object URLs
    attachments.forEach((attachment) => {
      if (attachment.preview) {
        URL.revokeObjectURL(attachment.preview)
      }
    })
    setAttachments([])
  }, [attachments])

  // Handle file input change or drop
  const handleFilesAdded = useCallback(
    async (files: FileList | File[] | null) => {
      if (!files) return

      setError('')

      const fileArray = Array.from(files)

      // Validate max files
      if (attachments.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      // Validate each file
      const validFiles: File[] = []
      const errors: string[] = []

      for (const file of fileArray) {
        if (maxSize && file.size > maxSize) {
          errors.push(
            `${file.name}: File size exceeds ${Math.round(maxSize / 1024 / 1024)}MB`,
          )
        } else {
          validFiles.push(file)
        }
      }

      if (errors.length > 0) {
        setError(errors.join(', '))
      }

      if (validFiles.length === 0) return

      // Create attachment objects
      const newAttachments: Attachment[] = await Promise.all(
        validFiles.map(async (file) => {
          const id = `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          let preview: string | undefined

          // Generate preview for images
          if (file.type.startsWith('image/')) {
            preview = URL.createObjectURL(file)
          }

          return {
            id,
            name: file.name,
            type: file.type.startsWith('image/') ? 'image' : 'file',
            file,
            preview,
            size: file.size,
          } as Attachment
        }),
      )

      setAttachments((prev) => [...prev, ...newAttachments])
    },
    [attachments.length, maxFiles, maxSize],
  )

  // Legacy compatibility
  const handleFileInputChange = useCallback(
    (files: FileList | null) => {
      handleFilesAdded(files)
    },
    [handleFilesAdded],
  )

  return {
    attachments,
    addAttachment,
    removeAttachment,
    clearAttachments,
    handleFileInputChange,
    handleFilesAdded,
    error,
    setError,
  }
}
