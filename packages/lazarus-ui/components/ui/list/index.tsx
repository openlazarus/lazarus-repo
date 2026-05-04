'use client'

import * as m from 'motion/react-m'
import React, { ReactNode, useCallback, useRef, useState } from 'react'

import LazyRender from '@/components/ui/lazy-render'
import Spinner from '@/components/ui/spinner'

export interface ListItem {
  id: string
  [key: string]: any
}

export interface ListAction<T extends ListItem> {
  label: string
  icon?: ReactNode
  onClick: (item: T) => void | Promise<void>
  variant?: 'primary' | 'secondary' | 'danger'
  disabled?: (item: T) => boolean
}

export interface ListProps<T extends ListItem> {
  title?: string
  items: T[]
  itemsToShow: number
  loadMore: () => void
  hasMore?: boolean
  fetchingMore?: boolean
  loading?: boolean
  isSearchResult?: boolean
  renderItem: (
    item: T,
    index: number,
    options: {
      isExpanded: boolean
      onToggleExpand: () => void
    },
  ) => ReactNode
  renderExpandedContent?: (item: T) => ReactNode
  actions?: ListAction<T>[]
  expandable?: boolean
  className?: string
  containerClassName?: string
  loadMoreText?: string
  allLoadedText?: string
  loadingText?: string

  // Empty state configuration
  emptyStateTitle?: string
  emptyStateDescription?: string
  emptyStateIcon?: ReactNode
}

// Ease curves
const EXPAND_EASE = [0.25, 1, 0.5, 1]
const _TAP_EASE = [0.25, 0.46, 0.45, 0.94] // ease-in-out curve
const _DELETE_EASE = [0.43, 0.13, 0.23, 0.96] // ease-out-expo for smooth exits

const ListComponent = <T extends ListItem>({
  title,
  items,
  itemsToShow,
  loadMore,
  hasMore = true,
  fetchingMore = false,
  loading = false,
  isSearchResult = false,
  renderItem,
  renderExpandedContent: _renderExpandedContent,
  actions: _actions,
  expandable: _expandable = false,
  className = '',
  containerClassName = '',
  loadMoreText,
  allLoadedText,
  loadingText = 'Loading...',
  emptyStateTitle,
  emptyStateDescription,
  emptyStateIcon,
}: ListProps<T>) => {
  const sectionRef = useRef<HTMLDivElement>(null)
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Handle item expansion - only one item can be expanded at a time
  const toggleExpanded = useCallback((itemId: string) => {
    setExpandedItemId((prev) => {
      // If clicking the same item, collapse it
      if (prev === itemId) {
        return null
      }
      // Otherwise, expand this item (and collapse any other)
      return itemId
    })
  }, [])

  // For search results, we still need a ref for animations
  // For infinite loading, show the load more button when there are more items to load
  // For regular pagination, show when items.length > itemsToShow
  const shouldShowLoadMore = isSearchResult
    ? false // Never show load more in search results
    : hasMore !== undefined
      ? hasMore // Use explicit hasMore value when provided
      : items.length > itemsToShow // Fallback to simple comparison

  // Show spinner during initial loading
  const renderLoadingCards = () => {
    return Array.from({ length: 3 }).map((_, index) => (
      <div
        key={`loading-${index}`}
        className='flex items-center justify-center p-6'>
        <Spinner size='md' />
      </div>
    ))
  }

  // Generate load more button text
  const getLoadMoreText = () => {
    if (fetchingMore) {
      return (
        <div className='flex items-center space-x-2'>
          <div className='h-3 w-3 animate-spin rounded-full border border-[#0098FC] border-t-transparent dark:border-[#4DB8FF]' />
          <span>{loadingText}</span>
        </div>
      )
    }

    const itemName = title ? title.toLowerCase().replace('your ', '') : 'items'

    if (hasMore !== undefined) {
      // Infinite loading mode
      if (hasMore) {
        return loadMoreText || `Load more ${itemName}`
      } else {
        return allLoadedText || `All ${itemName} loaded`
      }
    } else {
      // Regular pagination mode (fallback)
      if (items.length > itemsToShow) {
        return (
          loadMoreText ||
          `Show more ${itemName} (${items.length - itemsToShow})`
        )
      } else {
        return allLoadedText || `All ${itemName} loaded`
      }
    }
  }

  return (
    <m.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{
        duration: 0.4,
      }}
      className={`space-y-3 ${className}`}>
      {title && (
        <h3 className='text-sm font-medium uppercase text-gray-500 dark:text-gray-400'>
          {title}
        </h3>
      )}

      <div className={`overflow-hidden bg-background ${containerClassName}`}>
        <div className='relative'>
          {loading ? (
            // Show spinner during initial loading
            <m.div
              ref={sectionRef}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.03,
                    delayChildren: 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  },
                },
              }}
              initial='hidden'
              animate='visible'
              className='relative z-10 divide-y divide-gray-200 dark:divide-gray-800'>
              {renderLoadingCards()}
            </m.div>
          ) : items.length === 0 ? (
            // Show empty state when no items
            <div className='flex flex-col items-center justify-center px-4 py-12 text-center'>
              <div className='mb-4'>
                {emptyStateIcon ||
                  (isSearchResult ? (
                    <svg
                      className='h-12 w-12 text-gray-400 dark:text-gray-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.5}
                        d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
                      />
                    </svg>
                  ) : (
                    <svg
                      className='h-12 w-12 text-gray-400 dark:text-gray-600'
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'>
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={1.5}
                        d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
                      />
                    </svg>
                  ))}
              </div>
              <h3 className='mb-2 text-lg font-medium text-gray-900 dark:text-gray-100'>
                {emptyStateTitle ||
                  (isSearchResult
                    ? title
                      ? `No ${title.toLowerCase()} found`
                      : 'No results found'
                    : title
                      ? `No ${title.toLowerCase()} yet`
                      : 'No items yet')}
              </h3>
              <p className='max-w-sm text-sm text-gray-500 dark:text-gray-400'>
                {emptyStateDescription ||
                  (isSearchResult
                    ? 'Try adjusting your search terms or filters'
                    : title
                      ? `Create your first ${title.toLowerCase().slice(0, -1)} to get started`
                      : 'Get started by creating your first item')}
              </p>
            </div>
          ) : (
            // Show actual items when loaded
            <m.div
              ref={sectionRef}
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: {
                    staggerChildren: 0.03,
                    delayChildren: 0.05,
                    ease: [0.25, 0.1, 0.25, 1],
                  },
                },
              }}
              initial='hidden'
              animate='visible'
              className='relative z-10 divide-y divide-gray-200 dark:divide-gray-800'>
              {items.slice(0, itemsToShow).map((item, index) => {
                const isExpanded = expandedItemId === item.id
                const onToggleExpand = () => toggleExpanded(item.id)

                return (
                  <m.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: 1,
                      transition: {
                        duration: 0.3,
                        ease: 'easeOut',
                      },
                    }}
                    exit={{
                      opacity: 0,
                      x: -60,
                      transition: {
                        duration: 0.3,
                        ease: _DELETE_EASE,
                        opacity: {
                          duration: 0.2,
                          ease: 'easeIn',
                        },
                      },
                    }}>
                    <LazyRender animate={false}>
                      {renderItem(item, index, { isExpanded, onToggleExpand })}
                    </LazyRender>
                  </m.div>
                )
              })}
            </m.div>
          )}

          {/* Show spinner below list when fetching more */}
          {!loading && items.length > 0 && fetchingMore && (
            <m.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className='flex items-center justify-center border-t border-gray-200 bg-gray-50/50 py-4 dark:border-gray-800 dark:bg-white/5'>
              <Spinner size='sm' />
            </m.div>
          )}

          {!loading && items.length > 0 && shouldShowLoadMore && (
            <m.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              onClick={loadMore}
              disabled={fetchingMore}
              className={`relative z-20 flex w-full items-center justify-center border-t border-gray-200 bg-gray-50 py-2.5 text-xs font-medium text-[#0098FC] dark:border-gray-800 dark:bg-white/10 dark:text-[#4DB8FF] ${
                fetchingMore ? 'cursor-not-allowed opacity-50' : ''
              }`}>
              {getLoadMoreText()}
            </m.button>
          )}
        </div>
      </div>
    </m.div>
  )
}

// Export the memoized component with proper generic typing
export const List = React.memo(ListComponent) as <T extends ListItem>(
  props: ListProps<T>,
) => JSX.Element
