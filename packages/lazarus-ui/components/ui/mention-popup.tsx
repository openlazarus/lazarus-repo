/**
 * Mention Popup Component
 *
 * Displays autocomplete dropdown for @ mentions
 * Shows workspace items with icons, names, and types
 */

'use client'

import {
  RiApps2Line,
  RiCalendarLine,
  RiFile2Line,
  RiLinkM,
  RiMessage3Line,
} from '@remixicon/react'
import { memo, useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'
import { SearchResult } from '@/services/workspace-index.service'

export interface MentionPopupProps {
  results: SearchResult[]
  selectedIndex: number
  onSelect: (index: number) => void
  onClose: () => void
  position?: { top: number; left: number }
  className?: string
}

export const MentionPopup = memo<MentionPopupProps>(
  ({ results, selectedIndex, onSelect, onClose, position, className }) => {
    const popupRef = useRef<HTMLDivElement>(null)
    const selectedRef = useRef<HTMLDivElement>(null)

    // Scroll selected item into view
    useEffect(() => {
      if (selectedRef.current) {
        selectedRef.current.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth',
        })
      }
    }, [selectedIndex])

    // Close on click outside
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          popupRef.current &&
          !popupRef.current.contains(event.target as Node)
        ) {
          onClose()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [onClose])

    if (results.length === 0) {
      return (
        <div
          ref={popupRef}
          className={cn(
            'absolute z-50 w-64 rounded-lg border bg-white shadow-lg',
            'dark:border-gray-700 dark:bg-gray-800',
            className,
          )}
          style={position}>
          <div className='p-4 text-center text-sm text-gray-500 dark:text-gray-400'>
            No items found
          </div>
        </div>
      )
    }

    return (
      <div
        ref={popupRef}
        className={cn(
          'absolute z-50 max-h-64 w-80 overflow-y-auto rounded-lg border bg-white shadow-lg',
          'dark:border-gray-700 dark:bg-gray-800',
          className,
        )}
        style={position}>
        {results.map((result, index) => (
          <div
            key={result.id}
            ref={index === selectedIndex ? selectedRef : null}
            className={cn(
              'flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors',
              'hover:bg-gray-100 dark:hover:bg-gray-700',
              index === selectedIndex &&
                'border-l-2 border-blue-500 bg-blue-50 dark:bg-blue-900/30',
            )}
            onClick={() => onSelect(index)}
            onMouseEnter={() => onSelect(index)}>
            {/* Icon */}
            <div className='flex-shrink-0'>
              <ItemIcon
                type={result.type}
                fileType={result.metadata?.fileType}
              />
            </div>

            {/* Content */}
            <div className='min-w-0 flex-1'>
              <div className='flex items-center gap-2'>
                <span className='truncate text-sm font-medium text-gray-900 dark:text-gray-100'>
                  {result.name}
                </span>
                {result.score !== undefined && result.score > 0 && (
                  <span className='text-xs text-gray-400'>
                    {Math.round((1 - result.score) * 100)}%
                  </span>
                )}
              </div>
              <div className='text-xs capitalize text-gray-500 dark:text-gray-400'>
                {result.type}
                {result.metadata?.path && (
                  <span className='ml-1 opacity-75'>
                    • {truncatePath(result.metadata.path)}
                  </span>
                )}
              </div>
            </div>

            {/* Selected indicator */}
            {index === selectedIndex && (
              <div className='h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-500' />
            )}
          </div>
        ))}

        {/* Footer hint */}
        <div className='border-t border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-900/50'>
          <div className='flex items-center justify-between text-xs text-gray-500 dark:text-gray-400'>
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
        </div>
      </div>
    )
  },
)

MentionPopup.displayName = 'MentionPopup'

// Helper component for item icons
function ItemIcon({ type, fileType }: { type: string; fileType?: string }) {
  const iconClass = 'w-5 h-5'

  switch (type) {
    case 'file':
      return (
        <div className='rounded bg-blue-100 p-1.5 dark:bg-blue-900/30'>
          <RiFile2Line
            className={cn(iconClass, 'text-blue-600 dark:text-blue-400')}
          />
        </div>
      )

    case 'conversation':
      return (
        <div className='rounded bg-purple-100 p-1.5 dark:bg-purple-900/30'>
          <RiMessage3Line
            className={cn(iconClass, 'text-purple-600 dark:text-purple-400')}
          />
        </div>
      )

    case 'app':
      return (
        <div className='rounded bg-green-100 p-1.5 dark:bg-green-900/30'>
          <RiApps2Line
            className={cn(iconClass, 'text-green-600 dark:text-green-400')}
          />
        </div>
      )

    case 'link':
      return (
        <div className='rounded bg-orange-100 p-1.5 dark:bg-orange-900/30'>
          <RiLinkM
            className={cn(iconClass, 'text-orange-600 dark:text-orange-400')}
          />
        </div>
      )

    case 'date-range':
      return (
        <div className='rounded bg-pink-100 p-1.5 dark:bg-pink-900/30'>
          <RiCalendarLine
            className={cn(iconClass, 'text-pink-600 dark:text-pink-400')}
          />
        </div>
      )

    default:
      return (
        <div className='rounded bg-gray-100 p-1.5 dark:bg-gray-700'>
          <RiFile2Line
            className={cn(iconClass, 'text-gray-600 dark:text-gray-400')}
          />
        </div>
      )
  }
}

// Helper to truncate long paths
function truncatePath(path: string, maxLength: number = 30): string {
  if (path.length <= maxLength) return path

  const parts = path.split('/')
  if (parts.length <= 2) {
    return path.slice(0, maxLength) + '...'
  }

  const fileName = parts[parts.length - 1]
  const firstDir = parts[0]

  if (fileName.length + firstDir.length + 5 <= maxLength) {
    return `${firstDir}/.../${fileName}`
  }

  return fileName.slice(0, maxLength - 3) + '...'
}
