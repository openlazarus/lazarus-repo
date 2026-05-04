'use client'

import { ChangeEvent, useCallback, useRef, useState } from 'react'

export interface MediaPickerOptions {
  /**
   * Acceptable file types (e.g., 'image/*', 'video/*', '.pdf,.docx')
   * @default '*'
   */
  accept?: string

  /**
   * Maximum file size in bytes
   * @default undefined (no limit)
   */
  maxSize?: number

  /**
   * Allow multiple file selection
   * @default false
   */
  multiple?: boolean

  /**
   * Validation function for custom file validation
   * @param file The file to validate
   * @returns true if valid, false or error message if invalid
   */
  validate?: (file: File) => boolean | string
}

export interface MediaFile {
  file: File
  preview: string | null
  name: string
  size: number
  type: string
}

export interface MediaPickerResult {
  /**
   * Reference to the file input element
   */
  fileInputRef: React.RefObject<HTMLInputElement>

  /**
   * Selected file(s)
   */
  selectedFiles: MediaFile[]

  /**
   * Error message if any
   */
  error: string | null

  /**
   * Handle file selection - can be passed directly to file input onChange
   */
  handleFileSelect: (e: ChangeEvent<HTMLInputElement>) => void

  /**
   * Programmatically trigger file selection dialog
   */
  triggerFileSelect: () => void

  /**
   * Clear selected files and errors
   */
  clearSelection: () => void

  /**
   * Check if files are currently selected
   */
  hasFiles: boolean
}

/**
 * Hook for handling media file selection from a device
 *
 * @example
 * ```tsx
 * const {
 *   fileInputRef,
 *   selectedFiles,
 *   handleFileSelect,
 *   triggerFileSelect,
 *   error,
 *   clearSelection,
 *   hasFiles
 * } = useMediaPicker({
 *   accept: 'image/*',
 *   maxSize: 5 * 1024 * 1024, // 5MB
 *   multiple: false
 * });
 * ```
 */
export function useMediaPicker(
  options: MediaPickerOptions = {},
): MediaPickerResult {
  const { accept = '*', maxSize, multiple = false, validate } = options

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedFiles, setSelectedFiles] = useState<MediaFile[]>([])
  const [error, setError] = useState<string | null>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      // Size validation
      if (maxSize && file.size > maxSize) {
        const sizeMB = Math.round(maxSize / 1024 / 1024)
        return `File exceeds maximum size (${sizeMB}MB)`
      }

      // Custom validation
      if (validate) {
        const validationResult = validate(file)
        if (validationResult !== true) {
          return typeof validationResult === 'string'
            ? validationResult
            : 'File validation failed'
        }
      }

      return null
    },
    [maxSize, validate],
  )

  const createPreview = useCallback((file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      // Only create previews for images
      if (!file.type.startsWith('image/')) {
        resolve(null)
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        resolve((e.target?.result as string) || null)
      }
      reader.onerror = () => {
        resolve(null)
      }
      reader.readAsDataURL(file)
    })
  }, [])

  const handleFileSelect = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])

      if (!files.length) {
        return
      }

      setError(null)

      // Validate all files
      for (const file of files) {
        const errorMessage = validateFile(file)
        if (errorMessage) {
          setError(errorMessage)
          // Reset the file input to allow selecting the same file again
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
          return
        }
      }

      // Process files
      const mediaFiles: MediaFile[] = await Promise.all(
        files.map(async (file) => ({
          file,
          preview: await createPreview(file),
          name: file.name,
          size: file.size,
          type: file.type,
        })),
      )

      setSelectedFiles(multiple ? mediaFiles : [mediaFiles[0]])

      // Reset the file input to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [validateFile, createPreview, multiple],
  )

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedFiles([])
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  return {
    fileInputRef,
    selectedFiles,
    error,
    handleFileSelect,
    triggerFileSelect,
    clearSelection,
    hasFiles: selectedFiles.length > 0,
  }
}
