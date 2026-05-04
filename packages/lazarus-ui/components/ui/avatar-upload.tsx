'use client'

import { RiImageEditLine, RiUpload2Line } from '@remixicon/react'
import { useEffect, useRef, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { useUploadAvatar } from '@/hooks/features/profile/use-upload-avatar'
import { useMediaPicker } from '@/hooks/ui/interaction/use-media-picker'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  src?: string
  fallback?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  onAvatarChange?: (imageUrl: string) => void
  isDark?: boolean
  className?: string
  editable?: boolean
}

const sizeClasses = {
  sm: 'h-16 w-16',
  md: 'h-24 w-24',
  lg: 'h-32 w-32',
  xl: 'h-40 w-40',
}

const iconSizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-12 w-12',
}

export function AvatarUpload({
  src,
  fallback = '?',
  size = 'lg',
  onAvatarChange,
  isDark = false,
  className = '',
  editable = true,
}: AvatarUploadProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const uploadingRef = useRef(false)

  // Use media picker for file selection
  const {
    fileInputRef,
    selectedFiles,
    handleFileSelect,
    triggerFileSelect,
    clearSelection,
    error: pickerError,
  } = useMediaPicker({
    accept: 'image/jpeg,image/png,image/gif,image/webp',
    maxSize: 5 * 1024 * 1024, // 5MB max
    multiple: false,
  })

  // Use upload hook for Supabase upload - it returns [mutate, state]
  const [uploadAvatar] = useUploadAvatar({
    onSuccess: (publicUrl) => {
      onAvatarChange?.(publicUrl)
      clearSelection()
      setIsUploading(false)
      uploadingRef.current = false
    },
    onError: (error) => {
      console.error('Failed to upload avatar:', error)
      clearSelection()
      setIsUploading(false)
      uploadingRef.current = false
    },
  })

  // Automatically upload when file is selected
  useEffect(() => {
    if (selectedFiles.length > 0 && selectedFiles[0] && !uploadingRef.current) {
      uploadingRef.current = true
      const file = selectedFiles[0].file
      const fileName = `avatar-${Date.now()}.${file.name.split('.').pop()}`
      setIsUploading(true)

      // Call the upload mutation
      uploadAvatar({
        file,
        fileName,
      }).catch((error) => {
        console.error('Upload failed:', error)
        setIsUploading(false)
        uploadingRef.current = false
        clearSelection()
      })
    }
  }, [selectedFiles])

  // Show picker errors
  useEffect(() => {
    if (pickerError) {
      console.error('File picker error:', pickerError)
    }
  }, [pickerError])

  // Reset image error when src changes
  useEffect(() => {
    setImageError(false)
  }, [src])

  const handleClick = () => {
    if (editable && !isUploading) {
      triggerFileSelect()
    }
  }

  return (
    <div className={cn('relative', className)}>
      <button
        type='button'
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        disabled={!editable || isUploading}
        className={cn(
          'relative overflow-hidden rounded-full',
          'transition-opacity duration-200',
          sizeClasses[size],
          editable && !isUploading && 'cursor-pointer',
          (!editable || isUploading) && 'cursor-not-allowed',
        )}>
        {/* Avatar Image or Fallback */}
        <div
          className={cn(
            'relative h-full w-full',
            isDark ? 'bg-white/10' : 'bg-black/5',
          )}>
          {src && !imageError ? (
            // Use regular img tag for better compatibility with local assets
            <img
              src={src}
              alt=''
              className='h-full w-full object-cover'
              onError={() => setImageError(true)}
            />
          ) : (
            <div
              className={cn(
                'flex h-full w-full items-center justify-center',
                'text-4xl font-bold',
                isDark ? 'text-white/60' : 'text-black/40',
              )}>
              {fallback}
            </div>
          )}
        </div>

        {/* Hover Overlay */}
        {editable && (
          <div
            className={cn(
              'absolute inset-0 flex items-center justify-center',
              'bg-black/50 backdrop-blur-sm',
              'transition-opacity duration-200',
              isHovered || isUploading ? 'opacity-100' : 'opacity-0',
            )}>
            {isUploading ? (
              <div className='flex flex-col items-center gap-2'>
                <Spinner size='sm' />
                <span className='text-xs font-medium text-white'>
                  Uploading...
                </span>
              </div>
            ) : (
              <div className='flex flex-col items-center gap-1'>
                {src ? (
                  <RiImageEditLine
                    className={cn('text-white', iconSizeClasses[size])}
                  />
                ) : (
                  <RiUpload2Line
                    className={cn('text-white', iconSizeClasses[size])}
                  />
                )}
                <span className='text-xs font-medium text-white'>
                  {src ? 'Change' : 'Upload'}
                </span>
              </div>
            )}
          </div>
        )}
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type='file'
        accept='image/jpeg,image/png,image/gif,image/webp'
        onChange={handleFileSelect}
        className='hidden'
        aria-label='Upload avatar'
      />

      {/* Edit Badge (always visible indicator) */}
      {editable && !isUploading && (
        <div
          className={cn(
            'absolute bottom-0 right-0',
            'flex h-8 w-8 items-center justify-center',
            'rounded-full border-2',
            isDark
              ? 'border-[#1d1d1f] bg-[#0098FC]'
              : 'border-white bg-[#0098FC]',
            'shadow-lg',
          )}>
          <RiImageEditLine className='h-4 w-4 text-white' />
        </div>
      )}
    </div>
  )
}
