'use client'

import { RiCloseLine, RiImageEditLine, RiUpload2Line } from '@remixicon/react'
import * as m from 'motion/react-m'
import { useEffect, useRef, useState } from 'react'

import { ColorPicker } from '@/components/ui/color-picker'
import Spinner from '@/components/ui/spinner'
import { useUploadWorkspaceAvatar } from '@/hooks/features/workspace/use-upload-workspace-avatar'
import { useMediaPicker } from '@/hooks/ui/interaction/use-media-picker'
import { cn } from '@/lib/utils'

interface WorkspaceAppearanceEditorProps {
  workspaceId: string
  workspaceName: string
  avatar?: string | null
  color?: string | null
  onAvatarChange: (avatar: string | null) => void
  onColorChange: (color: string | null) => void
  isDark?: boolean
}

export function WorkspaceAppearanceEditor({
  workspaceId,
  workspaceName,
  avatar,
  color,
  onAvatarChange,
  onColorChange,
  isDark = false,
}: WorkspaceAppearanceEditorProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const uploadingRef = useRef(false)

  // Media picker for file selection
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

  // Upload hook for workspace avatars
  const [uploadAvatar] = useUploadWorkspaceAvatar({
    onSuccess: (publicUrl) => {
      onAvatarChange(publicUrl)
      clearSelection()
      setIsUploading(false)
      uploadingRef.current = false
    },
    onError: (error) => {
      console.error('Failed to upload workspace avatar:', error)
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

      uploadAvatar({
        workspaceId,
        file,
        fileName,
      }).catch((error) => {
        console.error('Upload failed:', error)
        setIsUploading(false)
        uploadingRef.current = false
        clearSelection()
      })
    }
  }, [selectedFiles, workspaceId, uploadAvatar, clearSelection])

  // Show picker errors
  useEffect(() => {
    if (pickerError) {
      console.error('File picker error:', pickerError)
    }
  }, [pickerError])

  // Reset image error when avatar changes
  useEffect(() => {
    setImageError(false)
  }, [avatar])

  const handleAvatarClick = () => {
    if (!isUploading) {
      triggerFileSelect()
    }
  }

  const handleClearAvatar = (e: React.MouseEvent) => {
    e.stopPropagation()
    onAvatarChange(null)
  }

  const handleClearColor = () => {
    onColorChange(null)
  }

  return (
    <div className='space-y-6'>
      {/* Avatar Section */}
      <div className='space-y-3'>
        <label className='text-[12px] font-medium opacity-70'>Avatar</label>
        <div className='flex items-center gap-4'>
          {/* Avatar Upload Button */}
          <m.button
            type='button'
            onClick={handleAvatarClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            disabled={isUploading}
            whileTap={{ opacity: 0.8 }}
            className={cn(
              'relative h-16 w-16 overflow-hidden rounded-full',
              'transition-opacity duration-200',
              !isUploading && 'cursor-pointer',
              isUploading && 'cursor-not-allowed',
            )}>
            {/* Avatar Image or Fallback */}
            <div
              className={cn(
                'relative h-full w-full',
                isDark ? 'bg-white/10' : 'bg-black/5',
              )}>
              {avatar && !imageError ? (
                <img
                  src={avatar}
                  alt=''
                  className='h-full w-full object-cover'
                  onError={() => setImageError(true)}
                />
              ) : color ? (
                <div
                  className='flex h-full w-full items-center justify-center text-xl font-semibold text-white'
                  style={{ backgroundColor: color }}>
                  {workspaceName?.charAt(0).toUpperCase() || 'W'}
                </div>
              ) : (
                <div
                  className={cn(
                    'flex h-full w-full items-center justify-center',
                    'text-xl font-semibold',
                    isDark ? 'text-white/40' : 'text-black/30',
                  )}>
                  {workspaceName?.charAt(0).toUpperCase() || 'W'}
                </div>
              )}
            </div>

            {/* Hover Overlay */}
            <div
              className={cn(
                'absolute inset-0 flex items-center justify-center',
                'bg-black/50 backdrop-blur-sm',
                'transition-opacity duration-200',
                isHovered || isUploading ? 'opacity-100' : 'opacity-0',
              )}>
              {isUploading ? (
                <Spinner size='sm' />
              ) : (
                <div className='flex flex-col items-center gap-0.5'>
                  {avatar ? (
                    <RiImageEditLine className='h-5 w-5 text-white' />
                  ) : (
                    <RiUpload2Line className='h-5 w-5 text-white' />
                  )}
                  <span className='text-[10px] font-medium text-white'>
                    {avatar ? 'Change' : 'Upload'}
                  </span>
                </div>
              )}
            </div>
          </m.button>

          {/* Avatar Actions */}
          <div className='flex flex-col gap-1'>
            <p
              className={cn(
                'text-[12px]',
                isDark ? 'text-white/50' : 'text-black/50',
              )}>
              Upload an image for your workspace
            </p>
            {avatar && (
              <button
                onClick={handleClearAvatar}
                className={cn(
                  'flex w-fit items-center gap-1 text-[12px] font-medium',
                  'text-red-500 hover:text-red-600',
                  'transition-colors duration-200',
                )}>
                <RiCloseLine className='h-3.5 w-3.5' />
                Remove avatar
              </button>
            )}
          </div>
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type='file'
          accept='image/jpeg,image/png,image/gif,image/webp'
          onChange={handleFileSelect}
          className='hidden'
          aria-label='Upload workspace avatar'
        />
      </div>

      {/* Color Section */}
      <div className='space-y-3'>
        <div className='flex items-center justify-between'>
          <label className='text-[12px] font-medium opacity-70'>Color</label>
          {color && (
            <button
              onClick={handleClearColor}
              className={cn(
                'flex items-center gap-1 text-[11px] font-medium',
                'text-red-500 hover:text-red-600',
                'transition-colors duration-200',
              )}>
              <RiCloseLine className='h-3 w-3' />
              Clear
            </button>
          )}
        </div>
        <ColorPicker value={color} onChange={onColorChange} size='md' />
        <p
          className={cn(
            'text-[11px]',
            isDark ? 'text-white/40' : 'text-black/40',
          )}>
          Color is shown when no avatar is set
        </p>
      </div>
    </div>
  )
}
