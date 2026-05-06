'use client'

import { RiFileLine, RiFolderLine, RiMessageLine } from '@remixicon/react'
import * as m from 'motion/react-m'
import Image from 'next/image'
import React, { forwardRef, useEffect, useRef } from 'react'

import {
  AtSignIcon,
  triggerAtSignAnimation,
} from '@/components/ui/icons/at-sign'
import { UploadIcon } from '@/components/ui/icons/upload'
import Spinner from '@/components/ui/spinner'
import { formatRelativeTime } from '@/lib/date-formatter'
import { getFileTypeIconComponent } from '@/lib/file-icons'
import { cn } from '@/lib/utils'
import { App, getAppIcon } from '@/model/app'
import { Conversation } from '@/model/conversation'
import { File } from '@/model/file'
import { Item, isItemOfType } from '@/model/item'

import { useTagPicker } from '../hooks/use-tag-picker'
import { useMessageBar } from '../message-bar-provider'

// More polished entry/exit animations
const ENTRY_TRANSITION = {
  type: 'spring',
  stiffness: 400,
  damping: 28,
  mass: 0.8,
}

const EXIT_TRANSITION = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.7,
  duration: 0.2,
}

// Hover and tap animations
const HOVER_TRANSITION = {
  type: 'spring',
  stiffness: 400,
  damping: 25,
  mass: 0.7,
}

const TAP_TRANSITION = {
  type: 'spring',
  stiffness: 500,
  damping: 30,
  mass: 0.6,
  duration: 0.15,
}

// Menu item animation variants with staggered delay
const menuItemVariants = {
  hidden: { opacity: 0, y: -8, scale: 0.95 },
  visible: (custom: number) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      ...ENTRY_TRANSITION,
      delay: custom * 0.025, // Slightly faster stagger
    },
  }),
  exit: {
    opacity: 0,
    y: -8,
    scale: 0.95,
    transition: EXIT_TRANSITION,
  },
}

// Container animation variants
const containerVariants = {
  hidden: {
    opacity: 0,
    scale: 0.97,
    y: -10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      ...ENTRY_TRANSITION,
      staggerChildren: 0.025,
      delayChildren: 0.02,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.97,
    y: -10,
    transition: EXIT_TRANSITION,
  },
}

// Inner content animation
const innerContentVariants = {
  hidden: { opacity: 0, y: -5 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      ...ENTRY_TRANSITION,
      delay: 0.04,
    },
  },
  exit: {
    opacity: 0,
    y: -5,
    transition: EXIT_TRANSITION,
  },
}

// Hover variants for buttons
const buttonHoverVariants = {
  initial: { scale: 1 },
  hover: { scale: 1 },
  tap: { scale: 0.98, transition: TAP_TRANSITION },
}

// Tag button hover variants - removed scale on hover
const tagButtonVariants = {
  initial: { scale: 1 },
  hover: { scale: 1 },
  tap: { scale: 0.97, transition: TAP_TRANSITION },
}

interface TagButtonProps {
  onClick: () => void
  size?: 'small' | 'default'
  variant?: 'mobile' | 'desktop'
  className?: string
  isDark?: boolean
}

export const TagButton = forwardRef<HTMLButtonElement, TagButtonProps>(
  (
    {
      onClick,
      size = 'default',
      variant = 'desktop',
      className = '',
      isDark = false,
    },
    ref,
  ) => {
    const isSmall = size === 'small'
    const atSignRef = useRef<any>(null)
    const uploadIconRef = useRef<any>(null)
    const itemId = 'context-button-at-sign'
    const menuRef = useRef<HTMLDivElement>(null)
    const showUploadOption =
      typeof window !== 'undefined' &&
      !(
        window.location.pathname.includes('/activity') ||
        window.location.pathname.includes('/agents') ||
        window.location.pathname.includes('/files') ||
        window.location.pathname.includes('/sources')
      )

    const { taggedItems, handleFilesAdded } = useMessageBar()
    const {
      isMenuOpen,
      toggleMenu,
      closeMenu,
      handleLocalFileUpload,
      navigateToWorkspace,
      recentItems,
      loadingRecentItems,
      tagRecentItem,
      mediaPickerState,
      currentPath,
      navigateIntoFolder,
      navigateUp,
      searchTerm,
      setSearchTerm,
      isSearching,
    } = useTagPicker()

    // Items are already filtered/searched by the backend — just use them directly
    const displayItems = recentItems

    // Handle click on the tag button
    const handleClick = (_e: React.MouseEvent) => {
      triggerAtSignAnimation(itemId)
      toggleMenu()
      onClick()
    }

    // Close menu when clicking outside
    useEffect(() => {
      if (!isMenuOpen) return

      const handleClickOutside = (event: MouseEvent) => {
        if (
          menuRef.current &&
          !menuRef.current.contains(event.target as Node)
        ) {
          closeMenu()
        }
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }, [isMenuOpen, closeMenu])

    // Check if we have recent items
    const hasItems = displayItems.length > 0

    return (
      <div className='relative' ref={menuRef}>
        <m.button
          ref={ref}
          onClick={handleClick}
          variants={tagButtonVariants}
          initial='initial'
          whileHover='hover'
          whileTap='tap'
          className={cn(
            'relative flex items-center gap-1.5 overflow-hidden transition-all duration-200',
            'border bg-transparent',
            isDark
              ? 'border-white/10 hover:border-white/20'
              : 'border-black/10 hover:border-black/20',
            isSmall
              ? 'h-7 rounded-md px-2 py-1'
              : 'h-8 rounded-md px-2.5 py-1.5',
            className,
          )}>
          <AtSignIcon
            ref={atSignRef}
            itemId={itemId}
            size={isSmall ? 16 : 18}
            className='text-[#0098FC]'
          />
          <span
            className={cn(
              'font-medium',
              isSmall ? 'text-xs' : 'text-sm',
              isDark ? 'text-white/90' : 'text-[#1d1d1f]',
            )}>
            Add context
          </span>
        </m.button>

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

        {/* Tag menu styled like dropdown-menu */}

        {isMenuOpen && (
          <m.div
            className={cn(
              'absolute bottom-full left-0 z-[9999] mb-2 w-[240px]',
              'overflow-hidden rounded-2xl',
              'border border-[#d2d2d7]/30 bg-white shadow-xl',
              isDark && 'border-white/10 bg-[#1d1d1f]',
            )}
            variants={containerVariants}
            initial='hidden'
            animate='visible'
            exit='exit'>
            <m.div
              variants={innerContentVariants}
              className='border-b border-[#e5e5e7]/20 px-3 py-2'>
              <h3
                className={cn(
                  'text-sm font-semibold',
                  isDark ? 'text-white' : 'text-[#1d1d1f]',
                )}>
                Add context
              </h3>
            </m.div>

            <div className='max-h-[340px] overflow-y-auto overflow-x-hidden'>
              <div className='py-1'>
                {/* Add local file - only show when not in memory layout */}
                {showUploadOption && (
                  <m.div
                    custom={0}
                    variants={menuItemVariants}
                    initial='hidden'
                    animate='visible'
                    exit='exit'>
                    <m.button
                      onClick={handleLocalFileUpload}
                      className={cn(
                        'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
                        'cursor-pointer hover:bg-black/[0.04]',
                        isDark && 'hover:bg-white/[0.06]',
                        isDark ? 'text-white' : 'text-[#1d1d1f]',
                      )}
                      variants={buttonHoverVariants}
                      initial='initial'
                      whileHover='hover'
                      whileTap='tap'>
                      <div
                        className={cn(
                          'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded',
                          isDark ? 'bg-white/[0.08]' : 'bg-[#fafafa]',
                        )}>
                        <UploadIcon ref={uploadIconRef} size={14} />
                      </div>
                      <span className='text-sm font-medium'>
                        Upload from device
                      </span>
                    </m.button>
                  </m.div>
                )}

                {/* Loading state - centered spinner placeholder */}
                {loadingRecentItems && !hasItems && (
                  <>
                    {showUploadOption && (
                      <div
                        className={cn(
                          'mx-2 my-0.5 border-t',
                          isDark ? 'border-white/10' : 'border-black/10',
                        )}
                      />
                    )}
                    <div className='flex items-center justify-center py-8'>
                      <Spinner size='md' />
                    </div>
                  </>
                )}

                {/* Recent items / folder browser section */}
                {(hasItems || currentPath || isSearching) && (
                  <>
                    {showUploadOption && (
                      <div
                        className={cn(
                          'mx-2 my-0.5 border-t',
                          isDark ? 'border-white/10' : 'border-black/10',
                        )}
                      />
                    )}

                    {/* Back button when inside a folder */}
                    {currentPath && (
                      <m.button
                        onClick={navigateUp}
                        className={cn(
                          'flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors',
                          'cursor-pointer hover:bg-black/[0.04]',
                          isDark && 'hover:bg-white/[0.06]',
                          isDark ? 'text-white' : 'text-[#1d1d1f]',
                        )}
                        variants={buttonHoverVariants}
                        initial='initial'
                        whileHover='hover'
                        whileTap='tap'>
                        <div
                          className={cn(
                            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded',
                            isDark ? 'bg-white/[0.08]' : 'bg-[#fafafa]',
                          )}>
                          <svg
                            width='14'
                            height='14'
                            viewBox='0 0 14 14'
                            fill='none'
                            className={
                              isDark ? 'text-white/60' : 'text-black/60'
                            }>
                            <path
                              d='M8.5 3.5L5 7L8.5 10.5'
                              stroke='currentColor'
                              strokeWidth='1.5'
                              strokeLinecap='round'
                              strokeLinejoin='round'
                            />
                          </svg>
                        </div>
                        <span className='text-sm font-medium'>Back</span>
                      </m.button>
                    )}

                    <div className='flex items-center justify-between px-3 py-1'>
                      <div
                        className={cn(
                          'flex items-center gap-1.5 text-xs',
                          isDark ? 'text-white/50' : 'text-[#86868b]',
                        )}>
                        {isSearching
                          ? 'Search Results'
                          : currentPath
                            ? currentPath.split('/').pop() || 'Root'
                            : 'Workspace Files'}
                      </div>
                    </div>

                    {/* Search input */}
                    <div className='px-3 pb-1'>
                      <div className='relative'>
                        <svg
                          width='14'
                          height='14'
                          viewBox='0 0 20 20'
                          fill='none'
                          className={cn(
                            'absolute left-2 top-1/2 -translate-y-1/2',
                            isDark ? 'text-white/50' : 'text-[#86868b]',
                          )}>
                          <path
                            d='M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z'
                            stroke='currentColor'
                            strokeWidth='1.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                          <path
                            d='M19 19L14.65 14.65'
                            stroke='currentColor'
                            strokeWidth='1.5'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                          />
                        </svg>
                        <input
                          type='text'
                          placeholder='Search items...'
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className={cn(
                            'h-7 w-full rounded-md pl-7 pr-2 text-xs',
                            isDark ? 'bg-white/[0.08]' : 'bg-[#f5f5f7]',
                            'border border-transparent',
                            isDark
                              ? 'placeholder:text-white/50'
                              : 'placeholder:text-[#86868b]',
                            isDark ? 'text-white' : 'text-[#1d1d1f]',
                            'focus:outline-none focus:ring-1',
                            isDark
                              ? 'focus:ring-white/20'
                              : 'focus:ring-[#0098FC]/30',
                            'transition-all duration-200',
                          )}
                        />
                      </div>
                    </div>

                    <div className='space-y-0'>
                      {displayItems.map((item, idx) => (
                        <RecentItemButton
                          key={item.id}
                          item={item}
                          onSelect={() => {
                            if (item.metadata?.isDirectory) {
                              navigateIntoFolder((item as any).path || item.id)
                            } else {
                              tagRecentItem(item)
                            }
                          }}
                          index={showUploadOption ? idx + 1 : idx}
                          isDirectory={!!item.metadata?.isDirectory}
                          showPath={isSearching}
                        />
                      ))}
                    </div>

                    {/* No results message */}
                    {searchTerm &&
                      displayItems.length === 0 &&
                      !loadingRecentItems && (
                        <div className='px-3 py-4 text-center'>
                          <p
                            className={cn(
                              'text-xs',
                              isDark ? 'text-white/50' : 'text-[#86868b]',
                            )}>
                            No items found
                          </p>
                        </div>
                      )}
                  </>
                )}
              </div>
            </div>
          </m.div>
        )}
      </div>
    )
  },
)

interface RecentItemButtonProps {
  item: Item
  onSelect: () => void
  index: number
  isDirectory?: boolean
  showPath?: boolean
}

// Get the appropriate icon for an item based on its type
const getItemIcon = (item: Item): React.ReactNode | string => {
  // Check if this is a directory
  if (item.metadata?.isDirectory) {
    return <RiFolderLine className='h-3.5 w-3.5 text-[#F5A623]' />
  }
  if (isItemOfType<File>(item, 'file')) {
    return getFileTypeIconComponent(item.fileType, 'h-3.5 w-3.5')
  } else if (isItemOfType<App>(item, 'app')) {
    return getAppIcon(item.app_type as any) // Keep as string for brand logos
  } else if (isItemOfType<Conversation>(item, 'conversation')) {
    return <RiMessageLine className='h-3.5 w-3.5 text-[#0098FC]' />
  }
  return <RiFileLine className='h-3.5 w-3.5 text-black/60' /> // Default
}

function RecentItemButton({
  item,
  onSelect,
  index,
  isDirectory,
  showPath,
}: RecentItemButtonProps) {
  // Extract parent directory for search results
  const parentDir = showPath
    ? ((item as any).path || '').split('/').slice(0, -1).join('/')
    : ''
  return (
    <m.div
      custom={index}
      variants={menuItemVariants}
      initial='hidden'
      animate='visible'
      exit='exit'>
      <m.button
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-2.5 px-3 py-1.5 text-left transition-colors',
          'cursor-pointer hover:bg-black/[0.04]',
          'dark:hover:bg-white/[0.06]',
          'text-[#1d1d1f] dark:text-white',
        )}
        variants={buttonHoverVariants}
        initial='initial'
        whileHover='hover'
        whileTap='tap'>
        <div
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded',
            item.isTagged
              ? 'bg-[#0098FC]/10'
              : isDirectory
                ? 'bg-[#F5A623]/10 dark:bg-[#F5A623]/15'
                : 'bg-[#fafafa] dark:bg-white/[0.08]',
          )}>
          {(() => {
            const icon = getItemIcon(item)
            if (typeof icon === 'string') {
              // App icons - still use Image component for brand logos
              return (
                <Image
                  src={icon}
                  alt={item.name || 'Item'}
                  width={14}
                  height={14}
                  className='h-3.5 w-3.5'
                />
              )
            } else {
              // React component (Remix icons)
              return icon
            }
          })()}
        </div>
        <div className='flex min-w-0 flex-1 items-center justify-between'>
          <div className='min-w-0 flex-1'>
            <div className='truncate text-sm font-medium leading-tight'>
              {item.name || (item as any).title || 'Untitled'}
            </div>
            {!isDirectory && (
              <div className='truncate text-xs text-[#86868b] dark:text-white/50'>
                {showPath && parentDir
                  ? parentDir
                  : formatRelativeTime(item.updatedAt)}
              </div>
            )}
          </div>
          {isDirectory ? (
            <svg
              width='14'
              height='14'
              viewBox='0 0 14 14'
              fill='none'
              className='ml-2 flex-shrink-0 text-black/30 dark:text-white/30'>
              <path
                d='M5.5 3.5L9 7L5.5 10.5'
                stroke='currentColor'
                strokeWidth='1.5'
                strokeLinecap='round'
                strokeLinejoin='round'
              />
            </svg>
          ) : (
            item.isTagged && (
              <svg
                width='14'
                height='14'
                viewBox='0 0 14 14'
                fill='none'
                className='ml-2 flex-shrink-0 text-[#0098FC]'>
                <path
                  d='M2.5 7L5.5 10L11.5 3'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                  strokeLinejoin='round'
                />
              </svg>
            )
          )}
        </div>
      </m.button>
    </m.div>
  )
}

TagButton.displayName = 'TagButton'
