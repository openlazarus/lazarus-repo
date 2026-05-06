'use client'

import { memo, useState } from 'react'

import Spinner from '@/components/ui/spinner'
import { cn } from '@/lib/utils'

import { ChatMessage } from '../types'

/**
 * Truncates long paths intelligently by keeping the filename and showing ellipsis in the middle
 * @param path - The full file path
 * @param maxLength - Maximum length before truncation (default: 60)
 */
function truncatePath(path: string, maxLength: number = 60): string {
  if (!path || path.length <= maxLength) return path

  // Try to keep the filename
  const parts = path.split('/')
  const filename = parts[parts.length - 1]

  // If the filename itself is too long, truncate it
  if (filename.length > maxLength - 10) {
    return '...' + filename.slice(-(maxLength - 3))
  }

  // Calculate how much space we have for the directory path
  const availableSpace = maxLength - filename.length - 7 // 7 for ".../" and "/"

  // Build path from the start
  let truncatedPath = parts[0] || ''
  for (let i = 1; i < parts.length - 1; i++) {
    const nextPart = parts[i]
    if ((truncatedPath + '/' + nextPart).length > availableSpace) {
      truncatedPath += '/.../' + filename
      return truncatedPath
    }
    truncatedPath += '/' + nextPart
  }

  return truncatedPath + '/' + filename
}

export interface BackgroundActionMessageProps {
  message: ChatMessage & {
    variant: {
      type: 'background-action'
      title: string
      status: 'executing' | 'success' | 'failed'
      description?: string
      details?: string
      expandable?: boolean
    }
  }
  className?: string
  uiVariant?: 'mobile' | 'desktop'
}

/**
 * BackgroundActionMessage - Shows background actions with muted styling
 * Uses spinner for executing state, icons for success/failure
 * No chat bubble background - appears as a subtle inline action
 */
export const BackgroundActionMessage = memo<BackgroundActionMessageProps>(
  ({ message, className, uiVariant: _uiVariant = 'desktop' }) => {
    const { title, status, description, details, expandable } = message.variant
    const [isExpanded, setIsExpanded] = useState(false)
    const isUser = message.role === 'user'

    const renderStatusIcon = () => {
      switch (status) {
        case 'executing':
          return <Spinner size='sm' className='shrink-0' />
        case 'success':
          return (
            <i
              className='ri-checkbox-circle-line shrink-0 text-[14px]'
              style={{ color: '#0098FC' }}
            />
          )
        case 'failed':
          return (
            <i className='ri-close-circle-line shrink-0 text-[14px] text-red-500' />
          )
        default:
          return null
      }
    }

    return (
      <div
        className={cn(
          'flex px-4 py-1.5 text-sm',
          isUser ? 'justify-end' : 'justify-start',
          className,
        )}>
        <div
          className={cn(
            'flex max-w-[85%] gap-2',
            isUser && 'flex-row-reverse',
          )}>
          {/* Icon stays anchored at the top */}
          <div className='flex shrink-0 pt-0.5'>{renderStatusIcon()}</div>

          <div className={cn('min-w-0 flex-1', isUser && 'text-right')}>
            <div
              className={cn(
                'flex items-center gap-1.5 text-gray-500',
                isUser && 'justify-end',
              )}>
              <span className='break-words text-[13px] font-medium leading-[18px]'>
                Lazarus {title}
                {status === 'executing' && '...'}
              </span>

              {expandable && details && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className='shrink-0 text-gray-400 transition-colors hover:text-gray-500'
                  aria-label={
                    isExpanded ? 'Collapse details' : 'Expand details'
                  }>
                  <i
                    className={cn(
                      'text-base transition-transform duration-300 ease-out',
                      isExpanded
                        ? 'ri-arrow-up-s-line'
                        : 'ri-arrow-down-s-line',
                    )}
                  />
                </button>
              )}
            </div>

            {description && (
              <div
                className={cn(
                  'mt-0.5 break-words text-xs leading-[16px] text-gray-400',
                  isUser && 'text-right',
                )}
                title={description}>
                {truncatePath(description)}
              </div>
            )}

            {/* Smooth expand/collapse with clean design */}
            {expandable && details && (
              <div
                className={cn(
                  'grid transition-all duration-300 ease-out',
                  isExpanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0',
                )}>
                <div className='overflow-hidden'>
                  <div
                    className={cn(
                      'mt-2 whitespace-pre-wrap break-words text-xs leading-[18px] text-gray-500',
                      isUser && 'text-right',
                    )}>
                    {details}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  },
)

BackgroundActionMessage.displayName = 'BackgroundActionMessage'
