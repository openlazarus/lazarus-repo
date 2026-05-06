'use client'

import * as m from 'motion/react-m'
import { ReactNode, useCallback, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'

export interface UploadedFile {
  id: string
  file: File
  preview?: string
  progress?: number
  error?: string
}

export interface FileUploadProps {
  onFilesSelected?: (files: File[]) => void
  onFilesChange?: (files: UploadedFile[]) => void
  accept?: string
  maxSize?: number // in bytes
  maxFiles?: number
  multiple?: boolean
  disabled?: boolean
  className?: string
  children?: ReactNode
  showPreview?: boolean
  autoUpload?: boolean
  onUpload?: (file: File) => Promise<void>
}

export function FileUpload({
  onFilesSelected,
  onFilesChange,
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 10,
  multiple = true,
  disabled = false,
  className = '',
  children,
  showPreview = true,
  autoUpload = false,
  onUpload,
}: FileUploadProps) {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [isDragActive, setIsDragActive] = useState(false)
  const [error, setError] = useState<string>('')
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
        return `File type not accepted. Accepted types: ${accept}`
      }
    }

    return null
  }

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return

      setError('')

      const fileArray = Array.from(files)

      // Validate max files
      if (uploadedFiles.length + fileArray.length > maxFiles) {
        setError(`Maximum ${maxFiles} files allowed`)
        return
      }

      // Validate each file
      const validFiles: File[] = []
      const errors: string[] = []

      for (const file of fileArray) {
        const validationError = validateFile(file)
        if (validationError) {
          errors.push(`${file.name}: ${validationError}`)
        } else {
          validFiles.push(file)
        }
      }

      if (errors.length > 0) {
        setError(errors.join(', '))
      }

      if (validFiles.length === 0) return

      // Create uploaded file objects
      const newUploadedFiles: UploadedFile[] = await Promise.all(
        validFiles.map(async (file) => {
          const id = `${file.name}-${Date.now()}-${Math.random()}`
          let preview: string | undefined

          // Generate preview for images
          if (file.type.startsWith('image/')) {
            preview = URL.createObjectURL(file)
          }

          return {
            id,
            file,
            preview,
            progress: autoUpload ? 0 : undefined,
          }
        }),
      )

      const updatedFiles = [...uploadedFiles, ...newUploadedFiles]
      setUploadedFiles(updatedFiles)

      // Notify parent
      onFilesSelected?.(validFiles)
      onFilesChange?.(updatedFiles)

      // Auto upload if enabled
      if (autoUpload && onUpload) {
        for (const uploadedFile of newUploadedFiles) {
          try {
            // Update progress
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id ? { ...f, progress: 50 } : f,
              ),
            )

            await onUpload(uploadedFile.file)

            // Mark as complete
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id ? { ...f, progress: 100 } : f,
              ),
            )
          } catch (err) {
            // Mark as error
            setUploadedFiles((prev) =>
              prev.map((f) =>
                f.id === uploadedFile.id
                  ? {
                      ...f,
                      error:
                        err instanceof Error ? err.message : 'Upload failed',
                    }
                  : f,
              ),
            )
          }
        }
      }
    },
    [
      uploadedFiles,
      maxFiles,
      onFilesSelected,
      onFilesChange,
      autoUpload,
      onUpload,
    ],
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

      handleFiles(e.dataTransfer.files)
    },
    [disabled, handleFiles],
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFiles(e.target.files)
      // Reset input value to allow selecting the same file again
      e.target.value = ''
    },
    [handleFiles],
  )

  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }, [disabled])

  const removeFile = useCallback(
    (fileId: string) => {
      const fileToRemove = uploadedFiles.find((f) => f.id === fileId)
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }

      const updatedFiles = uploadedFiles.filter((f) => f.id !== fileId)
      setUploadedFiles(updatedFiles)
      onFilesChange?.(updatedFiles)
    },
    [uploadedFiles, onFilesChange],
  )

  return (
    <div className={`w-full ${className}`}>
      {/* Drop Zone */}
      <m.div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className='relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all'
        style={{
          borderColor: isDragActive
            ? 'hsl(var(--lazarus-blue))'
            : 'hsl(var(--border-dark))',
          backgroundColor: isDragActive
            ? 'hsl(var(--lazarus-blue) / 0.05)'
            : 'hsl(var(--input))',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transitionDuration: 'var(--motion-duration-micro)',
        }}
        animate={{
          scale: isDragActive ? 1.02 : 1,
        }}
        transition={{ duration: 0.2 }}>
        <input
          ref={fileInputRef}
          type='file'
          onChange={handleFileInputChange}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          className='hidden'
        />

        {children ? (
          children
        ) : (
          <div className='flex flex-col items-center gap-3 px-6 py-8 text-center'>
            <m.div
              className='rounded-full p-4'
              style={{
                backgroundColor: 'hsl(var(--muted))',
              }}
              animate={{
                scale: isDragActive ? 1.1 : 1,
              }}>
              <svg
                className='h-8 w-8'
                style={{ color: 'hsl(var(--muted-foreground))' }}
                fill='none'
                viewBox='0 0 24 24'
                stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12'
                />
              </svg>
            </m.div>

            <div>
              <p
                className='text-base font-medium'
                style={{ color: 'hsl(var(--text-primary))' }}>
                {isDragActive
                  ? 'Drop files here'
                  : 'Drag and drop files here, or click to browse'}
              </p>
              <p
                className='mt-1 text-sm'
                style={{ color: 'hsl(var(--text-secondary))' }}>
                {accept && `Accepted types: ${accept}`}
                {maxSize && ` • Max size: ${formatFileSize(maxSize)}`}
                {maxFiles && ` • Max files: ${maxFiles}`}
              </p>
            </div>

            <Button variant='secondary' size='medium'>
              Browse Files
            </Button>
          </div>
        )}
      </m.div>

      {/* Error Message */}
      {error && (
        <m.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mt-3 rounded-lg p-3 text-sm'
          style={{
            backgroundColor: 'hsl(var(--destructive) / 0.1)',
            color: 'hsl(var(--destructive))',
          }}>
          {error}
        </m.div>
      )}

      {/* File List */}
      {showPreview && uploadedFiles.length > 0 && (
        <m.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className='mt-4 space-y-2'>
          <p
            className='text-sm font-medium'
            style={{ color: 'hsl(var(--text-primary))' }}>
            Uploaded Files ({uploadedFiles.length})
          </p>
          <div className='space-y-2'>
            {uploadedFiles.map((uploadedFile) => (
              <FilePreview
                key={uploadedFile.id}
                uploadedFile={uploadedFile}
                onRemove={removeFile}
              />
            ))}
          </div>
        </m.div>
      )}
    </div>
  )
}

interface FilePreviewProps {
  uploadedFile: UploadedFile
  onRemove: (fileId: string) => void
}

function FilePreview({ uploadedFile, onRemove }: FilePreviewProps) {
  const { file, preview, progress, error } = uploadedFile
  const [isHovered, setIsHovered] = useState(false)

  return (
    <m.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className='group relative flex items-center gap-3 rounded-lg border p-3 transition-all'
      style={{
        borderColor: 'hsl(var(--border-dark))',
        backgroundColor: 'hsl(var(--card))',
      }}>
      {/* File Icon or Preview */}
      <div className='flex-shrink-0'>
        {preview ? (
          <img
            src={preview}
            alt={file.name}
            className='h-12 w-12 rounded object-cover'
          />
        ) : (
          <div
            className='flex h-12 w-12 items-center justify-center rounded'
            style={{ backgroundColor: 'hsl(var(--input))' }}>
            {getFileIconComponent(file.name)}
          </div>
        )}
      </div>

      {/* File Info */}
      <div className='min-w-0 flex-1'>
        <p
          className='truncate text-sm font-medium'
          style={{ color: 'hsl(var(--text-primary))' }}>
          {file.name}
        </p>
        <p className='text-xs' style={{ color: 'hsl(var(--text-secondary))' }}>
          {formatFileSize(file.size)}
          {progress !== undefined && progress < 100 && (
            <span className='ml-2'>• Uploading {progress}%</span>
          )}
          {progress === 100 && (
            <span
              className='ml-2'
              style={{ color: 'hsl(var(--lazarus-blue))' }}>
              • Uploaded
            </span>
          )}
          {error && (
            <span className='ml-2' style={{ color: 'hsl(var(--destructive))' }}>
              • {error}
            </span>
          )}
        </p>

        {/* Progress Bar */}
        {progress !== undefined && progress < 100 && !error && (
          <div
            className='mt-2 h-1 w-full overflow-hidden rounded-full'
            style={{ backgroundColor: 'hsl(var(--muted))' }}>
            <m.div
              className='h-full'
              style={{ backgroundColor: 'hsl(var(--lazarus-blue))' }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}
      </div>

      {/* Remove Button */}
      <m.button
        onClick={() => onRemove(uploadedFile.id)}
        className='relative flex-shrink-0 overflow-hidden rounded-lg p-1.5'
        style={{
          color: 'hsl(var(--text-secondary))',
        }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        title='Remove file'>
        <m.div
          className='absolute inset-0'
          style={{ backgroundColor: 'hsl(var(--input))' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
        />
        <svg
          className='relative z-10 h-5 w-5'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M6 18L18 6M6 6l12 12'
          />
        </svg>
      </m.button>
    </m.div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

function getFileIconComponent(filename: string): JSX.Element {
  const ext = filename.split('.').pop()?.toLowerCase() || ''

  // Color mapping based on file type
  const getColorForExtension = (extension: string): string => {
    // Documents - Blue
    if (['pdf', 'doc', 'docx', 'txt', 'rtf'].includes(extension)) {
      return 'hsl(var(--lazarus-blue))'
    }
    // Spreadsheets - Green
    if (['xls', 'xlsx', 'csv', 'numbers'].includes(extension)) {
      return '#217346'
    }
    // Presentations - Orange
    if (['ppt', 'pptx', 'key'].includes(extension)) {
      return '#D97706'
    }
    // Images - Pink
    if (
      ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'ico'].includes(extension)
    ) {
      return '#EC4899'
    }
    // Video - Purple
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) {
      return '#7C3AED'
    }
    // Audio - Green
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(extension)) {
      return '#059669'
    }
    // Archives - Gray
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(extension)) {
      return 'hsl(var(--muted-foreground))'
    }
    // Code - Gray
    if (
      [
        'js',
        'ts',
        'jsx',
        'tsx',
        'py',
        'java',
        'cpp',
        'c',
        'html',
        'css',
        'json',
        'xml',
        'sql',
      ].includes(extension)
    ) {
      return 'hsl(var(--text-secondary))'
    }
    // Default
    return 'hsl(var(--muted-foreground))'
  }

  return (
    <div
      className='flex h-full w-full items-center justify-center text-xs font-semibold uppercase'
      style={{ color: getColorForExtension(ext) }}>
      {ext || 'FILE'}
    </div>
  )
}
