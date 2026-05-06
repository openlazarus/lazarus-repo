'use client'

import { RiCheckLine, RiCloseLine, RiErrorWarningLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import { useCallback, useEffect, useState } from 'react'

import { cn } from '@/lib/utils'
import {
  formatFileSize,
  UploadItem,
  useUploadProgressStore,
} from '@/store/upload-progress-store'

interface UploadProgressOverlayProps {
  isDark?: boolean
  className?: string
}

/**
 * Upload progress overlay component
 * Shows at the bottom of the file tree with upload progress for multiple files
 */
export function UploadProgressOverlay({
  isDark = false,
  className,
}: UploadProgressOverlayProps) {
  const uploads = useUploadProgressStore((state) => state.uploads)
  const removeUpload = useUploadProgressStore((state) => state.removeUpload)
  const clearCompleted = useUploadProgressStore((state) => state.clearCompleted)
  const clearAll = useUploadProgressStore((state) => state.clearAll)

  const [isExpanded, setIsExpanded] = useState(true)
  const [autoHideTimer, setAutoHideTimer] = useState<NodeJS.Timeout | null>(
    null,
  )

  const uploadItems = Array.from(uploads.values())
  const hasUploads = uploadItems.length > 0
  const activeUploads = uploadItems.filter(
    (u) => u.status === 'pending' || u.status === 'uploading',
  )
  const completedUploads = uploadItems.filter((u) => u.status === 'completed')
  const errorUploads = uploadItems.filter((u) => u.status === 'error')
  const hasActiveUploads = activeUploads.length > 0

  // Calculate overall progress
  const overallProgress =
    uploadItems.length > 0
      ? uploadItems.reduce((sum, u) => sum + u.progress, 0) / uploadItems.length
      : 0

  // Auto-hide when all uploads complete (after 3 seconds)
  useEffect(() => {
    if (!hasActiveUploads && completedUploads.length > 0 && hasUploads) {
      const timer = setTimeout(() => {
        clearCompleted()
      }, 3000)
      setAutoHideTimer(timer)
      return () => clearTimeout(timer)
    }
    if (autoHideTimer) {
      clearTimeout(autoHideTimer)
      setAutoHideTimer(null)
    }
  }, [hasActiveUploads, completedUploads.length, hasUploads, clearCompleted])

  const handleDismiss = useCallback(() => {
    if (hasActiveUploads) {
      setIsExpanded(false)
    } else {
      clearAll()
    }
  }, [hasActiveUploads, clearAll])

  if (!hasUploads) return null

  return (
    <m.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'absolute bottom-0 left-0 right-0 z-40 border-t',
        isDark
          ? 'border-white/[0.08] bg-[#111112]'
          : 'border-black/[0.05] bg-white',
        className,
      )}>
      {/* Header - always visible */}
      <m.div
        className={cn(
          'flex cursor-pointer items-center justify-between px-3 py-2',
          isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-black/[0.02]',
        )}
        onClick={() => setIsExpanded(!isExpanded)}
        whileTap={{ opacity: 0.8 }}>
        <div className='flex items-center gap-2'>
          {/* Status indicator */}
          {hasActiveUploads ? (
            <m.div
              className='h-2 w-2 rounded-full'
              style={{ backgroundColor: 'hsl(var(--lazarus-blue))' }}
              animate={{ opacity: [1, 0.5, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          ) : errorUploads.length > 0 ? (
            <div
              className='h-2 w-2 rounded-full'
              style={{ backgroundColor: 'hsl(var(--destructive))' }}
            />
          ) : (
            <div
              className='h-2 w-2 rounded-full'
              style={{ backgroundColor: 'hsl(120 60% 50%)' }}
            />
          )}

          {/* Summary text */}
          <span
            className='text-[13px] font-medium'
            style={{ color: isDark ? 'white' : 'black' }}>
            {hasActiveUploads
              ? `Uploading ${activeUploads.length} file${activeUploads.length > 1 ? 's' : ''}`
              : errorUploads.length > 0
                ? `${errorUploads.length} failed, ${completedUploads.length} completed`
                : `${completedUploads.length} file${completedUploads.length > 1 ? 's' : ''} uploaded`}
          </span>

          {/* Overall progress */}
          {hasActiveUploads && (
            <span
              className='text-[12px]'
              style={{
                color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)',
              }}>
              {Math.round(overallProgress)}%
            </span>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            handleDismiss()
          }}
          className={cn(
            'flex h-5 w-5 items-center justify-center rounded-full transition-colors',
            isDark
              ? 'text-white/50 hover:bg-white/[0.1] hover:text-white/80'
              : 'text-black/50 hover:bg-black/[0.05] hover:text-black/80',
          )}>
          <RiCloseLine className='h-3.5 w-3.5' />
        </button>
      </m.div>

      {/* Progress bar - compact view when collapsed */}
      {hasActiveUploads && (
        <div
          className='h-0.5 w-full overflow-hidden'
          style={{
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.05)',
          }}>
          <m.div
            className='h-full'
            style={{ backgroundColor: 'hsl(var(--lazarus-blue))' }}
            initial={{ width: 0 }}
            animate={{ width: `${overallProgress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Expanded file list */}
      {isExpanded && (
        <m.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className='max-h-[200px] overflow-y-auto'>
          <div className='space-y-1 px-2 pb-2'>
            {uploadItems.map((item) => (
              <UploadItemRow
                key={item.id}
                item={item}
                isDark={isDark}
                onRemove={() => removeUpload(item.id)}
              />
            ))}
          </div>
        </m.div>
      )}
    </m.div>
  )
}

interface UploadItemRowProps {
  item: UploadItem
  isDark: boolean
  onRemove: () => void
}

function UploadItemRow({ item, isDark, onRemove }: UploadItemRowProps) {
  const isActive = item.status === 'pending' || item.status === 'uploading'
  const isComplete = item.status === 'completed'
  const isError = item.status === 'error'

  return (
    <m.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'group flex items-center gap-2 rounded-md px-2 py-1.5',
        isDark ? 'hover:bg-white/[0.03]' : 'hover:bg-black/[0.02]',
      )}>
      {/* Status icon */}
      <div className='flex-shrink-0'>
        {isActive ? (
          <m.div
            className='h-4 w-4 rounded-full border-2'
            style={{
              borderColor: 'hsl(var(--lazarus-blue))',
              borderTopColor: 'transparent',
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
        ) : isComplete ? (
          <div
            className='flex h-4 w-4 items-center justify-center rounded-full'
            style={{ backgroundColor: 'hsl(120 60% 50%)' }}>
            <RiCheckLine className='h-2.5 w-2.5 text-white' />
          </div>
        ) : (
          <div
            className='flex h-4 w-4 items-center justify-center rounded-full'
            style={{ backgroundColor: 'hsl(var(--destructive))' }}>
            <RiErrorWarningLine className='h-2.5 w-2.5 text-white' />
          </div>
        )}
      </div>

      {/* File info */}
      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <span
            className='truncate text-[12px]'
            style={{ color: isDark ? 'white' : 'black' }}>
            {item.fileName}
          </span>
          <span
            className='flex-shrink-0 text-[11px]'
            style={{
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)',
            }}>
            {formatFileSize(item.fileSize)}
          </span>
        </div>

        {/* Progress bar for active uploads */}
        {isActive && (
          <div
            className='mt-1 h-1 w-full overflow-hidden rounded-full'
            style={{
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.1)'
                : 'rgba(0,0,0,0.05)',
            }}>
            <m.div
              className='h-full rounded-full'
              style={{ backgroundColor: 'hsl(var(--lazarus-blue))' }}
              initial={{ width: 0 }}
              animate={{ width: `${item.progress}%` }}
              transition={{ duration: 0.2 }}
            />
          </div>
        )}

        {/* Error message */}
        {isError && item.error && (
          <span
            className='text-[11px]'
            style={{ color: 'hsl(var(--destructive))' }}>
            {item.error}
          </span>
        )}
      </div>

      {/* Progress percentage or remove button */}
      <div className='flex-shrink-0'>
        {isActive ? (
          <span
            className='text-[11px] tabular-nums'
            style={{ color: 'hsl(var(--lazarus-blue))' }}>
            {item.progress}%
          </span>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className={cn(
              'flex h-4 w-4 items-center justify-center rounded-full opacity-0 transition-opacity group-hover:opacity-100',
              isDark
                ? 'text-white/50 hover:bg-white/[0.1] hover:text-white/80'
                : 'text-black/50 hover:bg-black/[0.05] hover:text-black/80',
            )}>
            <RiCloseLine className='h-3 w-3' />
          </button>
        )}
      </div>
    </m.div>
  )
}
