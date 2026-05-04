'use client'

import { RiAtLine } from '@remixicon/react'
import { forwardRef, useRef } from 'react'

import { DropdownMenu } from '@/components/ui'
import { formatRelativeTime } from '@/lib/date-formatter'
import { cn } from '@/lib/utils'

import { useTagPicker } from '../hooks/use-tag-picker'
import { useMessageBar } from '../message-bar-provider'

interface TagDropdownProps {
  onClick?: () => void
  size?: 'small' | 'default'
  variant?: 'mobile' | 'desktop'
  isDark?: boolean
  className?: string
}

export const TagDropdown = forwardRef<HTMLButtonElement, TagDropdownProps>(
  (
    {
      onClick,
      size = 'default',
      variant = 'desktop',
      isDark = false,
      className = '',
    },
    ref,
  ) => {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { taggedItems } = useMessageBar()
    const {
      handleLocalFileUpload,
      navigateToWorkspace,
      recentItems,
      tagRecentItem,
      mediaPickerState,
    } = useTagPicker()

    // Build dropdown options with proper labels (no icons in options for clean design)
    const options: Array<{
      value: string
      label: string
      divider?: boolean
      disabled?: boolean
      description?: string
    }> = [
      {
        value: 'upload',
        label: 'Upload from device',
      },
      {
        value: 'workspace',
        label: 'Browse workspace',
      },
    ]

    // Add divider if we have recent items
    if (recentItems.length > 0) {
      options.push({
        value: 'divider-1',
        label: '',
        divider: true,
      })

      // Add header for recent items
      options.push({
        value: 'recent-header',
        label: 'Recent Items',
        disabled: true,
      })

      // Add recent items (limit to first 5)
      recentItems.slice(0, 5).forEach((item, index) => {
        const timeAgo = formatRelativeTime(item.updatedAt)
        options.push({
          value: `recent-${item.id}`,
          label: item.name || 'Untitled',
          description: timeAgo,
        })
      })
    }

    const handleSelect = (value: string) => {
      if (value === 'upload') {
        handleLocalFileUpload()
      } else if (value === 'workspace') {
        navigateToWorkspace()
      } else if (value.startsWith('recent-')) {
        const itemId = value.replace('recent-', '')
        const item = recentItems.find((i) => i.id === itemId)
        if (item) {
          tagRecentItem(item)
        }
      }
      onClick?.()
    }

    return (
      <div className='flex items-center gap-1.5'>
        {/* Hidden file input */}
        <input
          type='file'
          ref={mediaPickerState.fileInputRef}
          onChange={mediaPickerState.handleFileSelect}
          className='hidden'
          accept='image/*,application/pdf'
        />

        {/* @ Icon */}
        <RiAtLine
          className={cn(
            'flex-shrink-0',
            size === 'small' ? 'h-4 w-4' : 'h-5 w-5',
            'text-blue-500',
          )}
        />

        <DropdownMenu
          options={options}
          onChange={handleSelect}
          placeholder='Add context'
          size={size === 'small' ? 'small' : 'medium'}
          variant='bordered'
          isDark={isDark}
          className={cn('min-w-[140px]', className)}
        />
      </div>
    )
  },
)

TagDropdown.displayName = 'TagDropdown'
