'use client'

import {
  RiCloseLine,
  RiFileTextLine,
  RiUploadCloudLine,
} from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

export interface FileInputProps {
  label?: string
  accept?: string
  maxSize?: number // in bytes
  disabled?: boolean
  error?: string
  helperText?: string
  required?: boolean
  isDark?: boolean
  onFileSelect?: (file: File) => void
  onClear?: () => void
  variant?: 'default' | 'ghost'
}

export function FileInput({
  label,
  accept = '.json',
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  error,
  helperText,
  required = false,
  isDark = false,
  onFileSelect,
  onClear,
  variant = 'default',
}: FileInputProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [validationError, setValidationError] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (maxSize && file.size > maxSize) {
      return `File size exceeds ${formatFileSize(maxSize)}`
    }

    if (accept) {
      const acceptedTypes = accept.split(',').map((type) => type.trim())
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`
      const mimeType = file.type

      const isAccepted = acceptedTypes.some((type) => {
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase()
        }
        if (type.endsWith('/*')) {
          return mimeType.startsWith(type.replace('/*', ''))
        }
        return mimeType === type
      })

      if (!isAccepted) {
        return `File type not accepted. Accepted: ${accept}`
      }
    }

    return null
  }

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) return

      setValidationError('')

      const validationError = validateFile(file)
      if (validationError) {
        setValidationError(validationError)
        return
      }

      setSelectedFile(file)
      onFileSelect?.(file)
    },
    [onFileSelect, maxSize, accept],
  )

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        setIsDragActive(true)
      }
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) {
        e.dataTransfer.dropEffect = 'copy'
      }
    },
    [disabled],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)

      if (disabled) return

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
    },
    [disabled, handleFile],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFile(files[0])
      }
      // Reset input value to allow selecting the same file again
      e.target.value = ''
    },
    [handleFile],
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const handleClear = useCallback(() => {
    setSelectedFile(null)
    setValidationError('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClear?.()
  }, [onClear])

  const displayError = error || validationError

  return (
    <div className='w-full'>
      {/* Label */}
      {label && (
        <label
          className={cn(
            'mb-2 block text-[13px] font-medium',
            isDark ? 'text-foreground/90' : 'text-[#1d1d1f]',
          )}>
          {label}
          {required && <span className='ml-1 text-red-500'>*</span>}
        </label>
      )}

      {/* File Input Area */}
      <m.div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative flex min-h-[100px] cursor-pointer items-center justify-center rounded-lg border transition-all',
          isDragActive && 'border-[#0098FC] bg-[#0098FC]/5',
          !isDragActive &&
            (variant === 'ghost'
              ? isDark
                ? 'border-white/10 bg-white/5'
                : 'border-black/10 bg-black/5'
              : isDark
                ? 'border-white/20 bg-white/5'
                : 'border-black/20 bg-white'),
          disabled && 'cursor-not-allowed opacity-50',
          displayError && 'border-red-500/50',
        )}
        animate={{
          scale: isDragActive ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}>
        <input
          ref={fileInputRef}
          type='file'
          onChange={handleFileInputChange}
          accept={accept}
          disabled={disabled}
          className='hidden'
        />

        {selectedFile ? (
          /* File Selected State */
          <div className='flex w-full items-center gap-3 px-4 py-3'>
            <div
              className={cn(
                'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg',
                isDark ? 'bg-white/10' : 'bg-black/5',
              )}>
              <RiFileTextLine
                className={cn(
                  'h-5 w-5',
                  isDark ? 'text-white/60' : 'text-black/60',
                )}
              />
            </div>

            <div className='min-w-0 flex-1'>
              <p
                className={cn(
                  'truncate text-sm font-medium',
                  isDark ? 'text-foreground' : 'text-[#1d1d1f]',
                )}>
                {selectedFile.name}
              </p>
              <p
                className={cn(
                  'text-xs',
                  isDark ? 'text-foreground/60' : 'text-[#666666]',
                )}>
                {formatFileSize(selectedFile.size)}
              </p>
            </div>

            <m.button
              type='button'
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
              className={cn(
                'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md transition-colors',
                isDark
                  ? 'text-white/60 hover:bg-white/10 hover:text-white/80'
                  : 'text-black/60 hover:bg-black/5 hover:text-black/80',
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}>
              <RiCloseLine className='h-5 w-5' />
            </m.button>
          </div>
        ) : (
          /* Empty State */
          <div className='flex flex-col items-center gap-2 px-6 py-4 text-center'>
            <m.div
              className={cn(
                'flex h-10 w-10 items-center justify-center rounded-full',
                isDark ? 'bg-white/10' : 'bg-black/5',
              )}
              animate={{
                scale: isDragActive ? 1.1 : 1,
              }}>
              <RiUploadCloudLine
                className={cn(
                  'h-5 w-5',
                  isDark ? 'text-white/60' : 'text-black/60',
                )}
              />
            </m.div>

            <div>
              <p
                className={cn(
                  'text-sm font-medium',
                  isDark ? 'text-foreground/90' : 'text-[#1d1d1f]',
                )}>
                {isDragActive
                  ? 'Drop file here'
                  : 'Drag and drop or click to browse'}
              </p>
              <p
                className={cn(
                  'mt-1 text-xs',
                  isDark ? 'text-foreground/60' : 'text-[#666666]',
                )}>
                {accept && `Accepted: ${accept}`}
                {accept && maxSize && ' • '}
                {maxSize && `Max ${formatFileSize(maxSize)}`}
              </p>
            </div>
          </div>
        )}
      </m.div>

      {/* Helper Text or Error */}
      {(helperText || displayError) && (
        <p
          className={cn(
            'mt-2 text-xs',
            displayError
              ? 'text-red-500'
              : isDark
                ? 'text-foreground/60'
                : 'text-[#666666]',
          )}>
          {displayError || helperText}
        </p>
      )}
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 10) / 10 + ' ' + sizes[i]
}
