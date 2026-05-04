'use client'

import { RiAlertLine, RiDeleteBinLine, RiUser6Fill } from '@remixicon/react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { memo, useCallback, useMemo, useState } from 'react'

import { useDeleteConversation } from '@/hooks/features/conversation/use-delete-conversation'
import { useTheme } from '@/hooks/ui/use-theme'
import { formatRelativeTime } from '@/lib/date-formatter'
import { cn } from '@/lib/utils'
import type { ConversationMetadata } from '@/model/conversation'

interface ConversationListItemProps {
  conversation: ConversationMetadata
  isSelected: boolean
  isExpanded: boolean
  onToggleExpand: () => void
  onSelect: (conversationId: string) => void
  onDeleted: (conversationId: string) => void
}

// Animation variants matching ItemExpandableContent
const expandVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: { duration: 0.2, ease: 'easeInOut' },
  },
}

// Check if we're on mobile for performance optimizations
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

export const ConversationListItem = memo<ConversationListItemProps>(
  ({
    conversation,
    isSelected,
    isExpanded,
    onToggleExpand,
    onSelect,
    onDeleted,
  }) => {
    const { isDark } = useTheme()
    const [deleteConfirmation, setDeleteConfirmation] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [deleteConversation] = useDeleteConversation(conversation.id)

    // Handle card click - select conversation
    const handleCardClick = useCallback(() => {
      onSelect(conversation.id)
    }, [conversation.id, onSelect])

    // Handle delete click - show expanded view with delete confirmation
    const handleDeleteClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!isExpanded) {
          onToggleExpand()
        }
        setDeleteConfirmation(true)
      },
      [isExpanded, onToggleExpand],
    )

    // Handle confirm delete
    const handleConfirmDelete = useCallback(
      async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (isProcessing) return

        setIsProcessing(true)
        try {
          await deleteConversation()
          onDeleted(conversation.id)
        } catch (error) {
          console.error('Failed to delete conversation:', error)
          setDeleteConfirmation(false)
        } finally {
          setIsProcessing(false)
        }
      },
      [conversation.id, deleteConversation, onDeleted, isProcessing],
    )

    // Handle cancel delete
    const handleCancelDelete = useCallback((e: React.MouseEvent) => {
      e.stopPropagation()
      setDeleteConfirmation(false)
    }, [])

    // Determine if we should use tap animation - memoized
    const shouldAnimateTap = useMemo(
      () =>
        !isExpanded && typeof window !== 'undefined' && window.innerWidth > 768,
      [isExpanded],
    )

    return (
      <m.div className='group relative flex cursor-pointer flex-col'>
        {/* Card content - cleaner layout */}
        <m.div
          role='button'
          tabIndex={0}
          className={cn(
            'flex w-full items-start gap-2 px-3 py-2.5 text-left transition-colors',
            'cursor-pointer',
            isDark ? 'hover:bg-white/[0.06]' : 'hover:bg-black/[0.04]',
            isSelected && 'bg-[#0098FC]/10',
          )}
          onClick={handleCardClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              handleCardClick()
            }
          }}
          whileHover={{ scale: 1 }}
          whileTap={{ scale: 0.98 }}>
          {/* Content */}
          <div className='min-w-0 flex-1'>
            {/* First line: Title and actions */}
            <div className='flex items-center justify-between gap-2'>
              <div className='min-w-0 flex-1 truncate text-[13px] font-medium leading-tight'>
                {conversation.title}
              </div>

              {/* Actions on the right */}
              <div className='flex flex-shrink-0 items-center gap-1'>
                {isSelected && (
                  <svg
                    width='12'
                    height='12'
                    viewBox='0 0 14 14'
                    fill='none'
                    className='flex-shrink-0 text-[#0098FC]'>
                    <path
                      d='M2.5 7L5.5 10L11.5 3'
                      stroke='currentColor'
                      strokeWidth='1.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  </svg>
                )}

                {/* Delete button */}
                <button
                  onClick={handleDeleteClick}
                  className={cn(
                    'rounded p-0.5 opacity-0 transition-all group-hover:opacity-100',
                    isDark
                      ? 'hover:bg-red-950/30 hover:text-red-400'
                      : 'hover:bg-red-50 hover:text-red-600',
                  )}
                  title='Delete conversation'>
                  <RiDeleteBinLine size={12} />
                </button>
              </div>
            </div>

            {/* Second line: Metadata */}
            <div className='mt-1 flex items-center gap-1.5'>
              <span
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-white/40' : 'text-[#86868b]',
                )}>
                {formatRelativeTime(conversation.lastActivity)}
              </span>
              <span
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-white/20' : 'text-[#86868b]/50',
                )}>
                ·
              </span>
              <span
                className={cn(
                  'text-[11px]',
                  isDark ? 'text-white/40' : 'text-[#86868b]',
                )}>
                {conversation.messageCount}{' '}
                {conversation.messageCount === 1 ? 'msg' : 'msgs'}
              </span>
              {conversation.agentName && (
                <>
                  <span
                    className={cn(
                      'text-[11px]',
                      isDark ? 'text-white/20' : 'text-[#86868b]/50',
                    )}>
                    ·
                  </span>
                  <span
                    className={cn(
                      'flex items-center gap-1 truncate text-[11px]',
                      isDark ? 'text-white/40' : 'text-[#86868b]',
                    )}>
                    <RiUser6Fill size={9} className='flex-shrink-0' />
                    <span className='truncate'>{conversation.agentName}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </m.div>

        {/* Expandable content - Delete Confirmation Only */}
        <AnimatePresence initial={false}>
          {isExpanded && deleteConfirmation && (
            <m.div
              key='delete-confirmation'
              initial={{ opacity: 0, height: 0 }}
              animate={{
                opacity: 1,
                height: 'auto',
                transition: {
                  duration: 0.3,
                  ease: [0.25, 0.1, 0.25, 1],
                },
              }}
              exit={{
                opacity: 0,
                height: 0,
                transition: {
                  duration: 0.2,
                  ease: [0.25, 0.1, 0.25, 1],
                },
              }}
              className='overflow-hidden border-t border-gray-100 bg-gray-50/80 backdrop-blur-[1px] dark:border-gray-800 dark:bg-white/10'
              onClick={(e) => e.stopPropagation()}>
              <div className='p-4'>
                <div className='mb-3 flex items-center text-sm font-medium text-gray-800 dark:text-gray-200'>
                  <RiAlertLine className='mr-1.5 text-red-500 dark:text-red-400' />
                  Delete "{conversation.title}"?
                </div>
                <div className='flex gap-2'>
                  <m.button
                    whileTap={isMobile ? undefined : { scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleConfirmDelete}
                    disabled={isProcessing}
                    className='flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50 dark:bg-red-600'>
                    {isProcessing ? 'Deleting...' : 'Delete'}
                  </m.button>
                  <m.button
                    whileTap={isMobile ? undefined : { scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    onClick={handleCancelDelete}
                    disabled={isProcessing}
                    className='flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-800 transition-colors dark:bg-[#161617] dark:text-gray-200'>
                    Cancel
                  </m.button>
                </div>
              </div>
            </m.div>
          )}
        </AnimatePresence>

        {/* Processing Overlay */}
        {isProcessing && !deleteConfirmation && isExpanded && (
          <m.div
            key='processing'
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className='absolute inset-0 z-20 flex items-center justify-center bg-white/80 backdrop-blur-sm dark:bg-black/60'>
            <div className='h-5 w-5 animate-spin rounded-full border-2 border-[#0098FC] border-t-transparent dark:border-[#4DB8FF]' />
          </m.div>
        )}
      </m.div>
    )
  },
)

ConversationListItem.displayName = 'ConversationListItem'
