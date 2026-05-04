'use client'

import { Box } from 'lucide-react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import { memo, useEffect } from 'react'

import { cn } from '@/lib/utils'
import { ConnectedAppType, getAppIcon, getAppIconType } from '@/model/app'
import { getFileTypeIcon } from '@/model/file'

import { MessageTag } from './types'

interface TagPreviewProps {
  tag: MessageTag | null
  isOpen: boolean
  onClose: () => void
  className?: string
}

// Get the appropriate icon for a tag
const getTagIcon = (tag: MessageTag): string => {
  if (tag.type === 'file' && tag.fileType) {
    return getFileTypeIcon(tag.fileType)
  } else if (tag.type === 'app' && tag.app_type) {
    return getAppIcon(tag.app_type as any)
  } else if (tag.type === 'conversation') {
    return '/icons/workspace/chat-icon.svg'
  }
  return tag.icon || '/icons/workspace/doc-icon.svg'
}

export const TagPreview = memo<TagPreviewProps>(
  ({ tag, isOpen, onClose, className }) => {
    // Close on escape key
    useEffect(() => {
      if (!isOpen) return

      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose()
      }

      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    if (!tag) return null

    // Determine icon type for apps
    const iconType =
      tag.type === 'app' && tag.app_type
        ? getAppIconType(tag.app_type as ConnectedAppType)
        : 'component'
    const iconPath = getTagIcon(tag)

    return (
      <>
        {/* Backdrop */}
        <m.div
          className='fixed inset-0 z-50 bg-black/50 backdrop-blur-sm'
          initial={{ opacity: 0 }}
          animate={{ opacity: isOpen ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />

        {/* Preview modal */}
        <m.div
          className={cn(
            'fixed inset-x-4 bottom-4 top-auto z-50',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2',
            'sm:w-[500px] sm:-translate-x-1/2 sm:-translate-y-1/2',
            className,
          )}
          initial={{
            opacity: 0,
            y: 100,
            scale: 0.95,
          }}
          animate={{
            opacity: isOpen ? 1 : 0,
            y: isOpen ? 0 : 100,
            scale: isOpen ? 1 : 0.95,
          }}
          exit={{
            opacity: 0,
            y: 100,
            scale: 0.95,
          }}
          transition={{
            type: 'spring',
            stiffness: 400,
            damping: 30,
            mass: 0.8,
          }}>
          <div className='overflow-hidden rounded-3xl bg-white shadow-2xl'>
            {/* Header */}
            <div className='relative p-6 pb-4'>
              <div className='flex items-start gap-4'>
                {/* Icon */}
                <m.div
                  className={cn(
                    'flex h-16 w-16 items-center justify-center rounded-2xl',
                    'bg-gradient-to-br shadow-lg',
                    tag.type === 'app' && 'from-purple-500/20 to-pink-500/20',
                    tag.type === 'file' && 'from-blue-500/20 to-cyan-500/20',
                    tag.type === 'conversation' &&
                      'from-green-500/20 to-emerald-500/20',
                  )}
                  initial={{ rotate: -10 }}
                  animate={{ rotate: 0 }}
                  transition={{ delay: 0.1 }}>
                  {tag.type === 'app' && iconType === 'remixicon' ? (
                    <i className={cn(iconPath, 'text-3xl text-gray-600')} />
                  ) : iconPath === 'PACKAGE_ICON' ? (
                    <Box className='h-8 w-8 text-[#0098FC]' />
                  ) : (
                    <Image
                      src={iconPath}
                      alt={tag.name || 'Tag'}
                      width={32}
                      height={32}
                      className='h-8 w-8'
                    />
                  )}
                </m.div>

                {/* Title and metadata */}
                <div className='flex-1'>
                  <h3 className='text-xl font-semibold text-gray-900'>
                    {tag.name || tag.title || 'Untitled'}
                  </h3>
                  <p className='mt-1 text-sm text-gray-500'>
                    {tag.type === 'app' && 'Application'}
                    {tag.type === 'file' &&
                      `File • ${tag.fileType || 'Unknown type'}`}
                    {tag.type === 'conversation' && 'Conversation'}
                  </p>
                  {tag.isFromAI && (
                    <div className='mt-2 flex items-center gap-1'>
                      <div className='h-2 w-2 rounded-full bg-[#0098FC]' />
                      <span className='text-xs font-medium text-[#0098FC]'>
                        AI Generated
                      </span>
                    </div>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className='flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 transition-colors hover:bg-gray-200'>
                  <svg
                    width='16'
                    height='16'
                    viewBox='0 0 24 24'
                    fill='none'
                    stroke='currentColor'
                    strokeWidth='2'
                    strokeLinecap='round'
                    strokeLinejoin='round'>
                    <line x1='18' y1='6' x2='6' y2='18' />
                    <line x1='6' y1='6' x2='18' y2='18' />
                  </svg>
                </button>
              </div>
            </div>

            {/* Preview content */}
            <div className='px-6 pb-6'>
              {tag.preview ? (
                <div className='max-h-[300px] overflow-y-auto rounded-2xl bg-gray-50 p-4'>
                  <pre className='whitespace-pre-wrap font-mono text-sm text-gray-700'>
                    {tag.preview}
                  </pre>
                </div>
              ) : (
                <div className='rounded-2xl bg-gray-50 p-8 text-center'>
                  <p className='text-gray-500'>No preview available</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className='border-t border-gray-100 px-6 py-4'>
              <div className='flex gap-3'>
                <button className='flex-1 rounded-xl bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200'>
                  Open
                </button>
                <button className='flex-1 rounded-xl bg-[#0098FC] px-4 py-2.5 font-medium text-white transition-colors hover:bg-[#0087e0]'>
                  Add to Chat
                </button>
              </div>
            </div>
          </div>
        </m.div>
      </>
    )
  },
)

TagPreview.displayName = 'TagPreview'
