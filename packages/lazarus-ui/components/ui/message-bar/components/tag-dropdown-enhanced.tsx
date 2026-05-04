'use client'

import { RiAtLine, RiCalendarLine, RiLinkM } from '@remixicon/react'
import { forwardRef, useState } from 'react'

import { DropdownMenu } from '@/components/ui'
import { useTagger } from '@/hooks/core/use-tagger'
import { formatRelativeTime } from '@/lib/date-formatter'
import { cn } from '@/lib/utils'
import { createDateRangeItem, createLinkItem } from '@/model/context-tags'
import { useStore } from '@/state/store'

import { useTagPicker } from '../hooks/use-tag-picker'
import { useMessageBar } from '../message-bar-provider'

interface TagDropdownEnhancedProps {
  onClick?: () => void
  size?: 'small' | 'default'
  variant?: 'mobile' | 'desktop'
  isDark?: boolean
  className?: string
}

// Date Range Picker Modal
const DateRangePicker = ({
  isOpen,
  onClose,
  onConfirm,
  isDark,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (start: Date, end: Date) => void
  isDark: boolean
}) => {
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  )
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0],
  )

  if (!isOpen) return null

  const handleConfirm = () => {
    onConfirm(new Date(startDate), new Date(endDate))
    onClose()
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div
        className={cn(
          'relative z-10 rounded-lg p-6 shadow-xl',
          isDark ? 'bg-[#1d1d1f]' : 'bg-white',
        )}>
        <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
          <RiCalendarLine className='h-5 w-5 text-blue-500' />
          Select Date Range
        </h3>

        <div className='space-y-4'>
          <div>
            <label
              className={cn(
                'mb-1 block text-sm font-medium',
                isDark ? 'text-white/70' : 'text-gray-700',
              )}>
              Start Date
            </label>
            <input
              type='date'
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={cn(
                'w-full rounded-md border px-3 py-2',
                isDark
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-gray-300 bg-white text-gray-900',
              )}
            />
          </div>

          <div>
            <label
              className={cn(
                'mb-1 block text-sm font-medium',
                isDark ? 'text-white/70' : 'text-gray-700',
              )}>
              End Date
            </label>
            <input
              type='date'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className={cn(
                'w-full rounded-md border px-3 py-2',
                isDark
                  ? 'border-white/10 bg-white/5 text-white'
                  : 'border-gray-300 bg-white text-gray-900',
              )}
            />
          </div>
        </div>

        <div className='mt-6 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              isDark
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className='rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600'>
            Add Date Range
          </button>
        </div>
      </div>
    </div>
  )
}

// Link Input Modal
const LinkInputModal = ({
  isOpen,
  onClose,
  onConfirm,
  isDark,
}: {
  isOpen: boolean
  onClose: () => void
  onConfirm: (url: string, title?: string) => void
  isDark: boolean
}) => {
  const [url, setUrl] = useState<string>('')
  const [title, setTitle] = useState<string>('')

  if (!isOpen) return null

  const handleConfirm = () => {
    if (url) {
      // Add https:// if no protocol specified
      const finalUrl = url.match(/^https?:\/\//) ? url : `https://${url}`
      onConfirm(finalUrl, title || undefined)
      onClose()
      setUrl('')
      setTitle('')
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center'>
      <div className='absolute inset-0 bg-black/50' onClick={onClose} />
      <div
        className={cn(
          'relative z-10 w-96 rounded-lg p-6 shadow-xl',
          isDark ? 'bg-[#1d1d1f]' : 'bg-white',
        )}>
        <h3 className='mb-4 flex items-center gap-2 text-lg font-semibold'>
          <RiLinkM className='h-5 w-5 text-blue-500' />
          Add Link
        </h3>

        <div className='space-y-4'>
          <div>
            <label
              className={cn(
                'mb-1 block text-sm font-medium',
                isDark ? 'text-white/70' : 'text-gray-700',
              )}>
              URL
            </label>
            <input
              type='url'
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder='https://example.com'
              className={cn(
                'w-full rounded-md border px-3 py-2',
                isDark
                  ? 'border-white/10 bg-white/5 text-white placeholder:text-white/30'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400',
              )}
            />
          </div>

          <div>
            <label
              className={cn(
                'mb-1 block text-sm font-medium',
                isDark ? 'text-white/70' : 'text-gray-700',
              )}>
              Title (optional)
            </label>
            <input
              type='text'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder='Page title'
              className={cn(
                'w-full rounded-md border px-3 py-2',
                isDark
                  ? 'border-white/10 bg-white/5 text-white placeholder:text-white/30'
                  : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400',
              )}
            />
          </div>
        </div>

        <div className='mt-6 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              isDark
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            )}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!url}
            className={cn(
              'rounded-md px-4 py-2 text-sm font-medium',
              url
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'cursor-not-allowed bg-gray-300 text-gray-500',
            )}>
            Add Link
          </button>
        </div>
      </div>
    </div>
  )
}

export const TagDropdownEnhanced = forwardRef<
  HTMLButtonElement,
  TagDropdownEnhancedProps
>(
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
    const { taggedItems, handleFilesAdded } = useMessageBar()
    const { setItems } = useStore()
    const { tagItem } = useTagger()
    const {
      handleLocalFileUpload,
      navigateToWorkspace,
      recentItems,
      tagRecentItem,
      mediaPickerState,
    } = useTagPicker()

    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showLinkInput, setShowLinkInput] = useState(false)

    // Handle date range confirmation
    const handleDateRangeConfirm = (startDate: Date, endDate: Date) => {
      const dateRangeItem = createDateRangeItem(startDate, endDate)

      // Add to items store
      setItems((prev) => ({
        ...prev,
        [dateRangeItem.id]: dateRangeItem,
      }))

      // Tag the item
      tagItem('current', dateRangeItem.id)
    }

    // Handle link confirmation
    const handleLinkConfirm = (url: string, title?: string) => {
      const linkItem = createLinkItem(url, title)

      // Add to items store
      setItems((prev) => ({
        ...prev,
        [linkItem.id]: linkItem,
      }))

      // Tag the item
      tagItem('current', linkItem.id)
    }

    // Build dropdown options with proper labels
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
      {
        value: 'date-range',
        label: 'Select date range',
      },
      {
        value: 'link',
        label: 'Add website link',
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
      recentItems.slice(0, 5).forEach((item) => {
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
      } else if (value === 'date-range') {
        setShowDatePicker(true)
      } else if (value === 'link') {
        setShowLinkInput(true)
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
      <>
        <div className='flex items-center gap-1.5'>
          {/* Hidden file input - routes through attachments system for image previews */}
          <input
            type='file'
            ref={mediaPickerState.fileInputRef}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFilesAdded(e.target.files)
              }
              e.target.value = ''
            }}
            className='hidden'
            accept='image/*,application/pdf'
            multiple
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

        {/* Date Range Picker Modal */}
        <DateRangePicker
          isOpen={showDatePicker}
          onClose={() => setShowDatePicker(false)}
          onConfirm={handleDateRangeConfirm}
          isDark={isDark}
        />

        {/* Link Input Modal */}
        <LinkInputModal
          isOpen={showLinkInput}
          onClose={() => setShowLinkInput(false)}
          onConfirm={handleLinkConfirm}
          isDark={isDark}
        />
      </>
    )
  },
)

TagDropdownEnhanced.displayName = 'TagDropdownEnhanced'
