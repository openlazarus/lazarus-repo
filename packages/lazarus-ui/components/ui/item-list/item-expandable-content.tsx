'use client'

import { RiAlertLine } from '@remixicon/react'
import { AnimatePresence } from 'motion/react'
import * as m from 'motion/react-m'
import { memo } from 'react'

import { Item } from '@/model'

import { ItemActions } from './item-actions'
import { LabelManager } from './label-manager'

import { ItemAction } from './index'

interface ItemExpandableContentProps {
  item: Item
  actions: ItemAction[]
  isExpanded: boolean
  deleteConfirmation: boolean
  showLabelManager: boolean
  isProcessing: boolean
  onMainAction: () => void
  onTag?: () => void
  onEdit?: () => void
  onDelete?: () => void
  onShowLabelManager: () => void
  onConfirmDelete: () => void
  onCancelDelete: () => void
  onCloseLabelManager: () => void
}

// Simplified animation variants for better mobile performance
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

// Animation ease curve - matches iOS styles
const _EXPAND_EASE = [0.25, 1, 0.5, 1]

// Check if we're on mobile for performance optimizations
const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

export const ItemExpandableContent = memo(
  ({
    item,
    actions,
    isExpanded,
    deleteConfirmation,
    showLabelManager,
    isProcessing,
    onMainAction,
    onTag,
    onEdit,
    onDelete,
    onShowLabelManager,
    onConfirmDelete,
    onCancelDelete,
    onCloseLabelManager,
  }: ItemExpandableContentProps) => {
    return (
      <AnimatePresence initial={false}>
        {isExpanded && (
          <m.div
            key='content'
            initial='collapsed'
            animate='expanded'
            exit='collapsed'
            variants={expandVariants}
            className='overflow-hidden'>
            {/* Actions, Label Manager, or Delete Confirmation */}
            {deleteConfirmation ? (
              <m.div
                key='delete-confirmation'
                initial={{ opacity: 0, y: -10 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: {
                    duration: 0.3,
                    ease: [0.25, 0.1, 0.25, 1],
                  },
                }}
                exit={{
                  opacity: 0,
                  y: -10,
                  transition: {
                    duration: 0.2,
                    ease: [0.25, 0.1, 0.25, 1],
                  },
                }}
                className='border-t border-gray-100 bg-gray-50/80 backdrop-blur-[1px] dark:border-gray-800 dark:bg-white/10'
                onClick={(e) => e.stopPropagation()}>
                <div className='p-4'>
                  <div className='mb-3 flex items-center text-sm font-medium text-gray-800 dark:text-gray-200'>
                    <RiAlertLine className='mr-1.5 text-red-500 dark:text-red-400' />{' '}
                    Delete "{item.name}"?
                  </div>
                  <div className='flex gap-2'>
                    <m.button
                      whileTap={isMobile ? undefined : { scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      onClick={onConfirmDelete}
                      disabled={isProcessing}
                      className='flex-1 rounded-lg bg-red-500 py-2 text-xs font-medium text-white transition-colors disabled:opacity-50 dark:bg-red-600'>
                      {isProcessing ? 'Deleting...' : 'Delete'}
                    </m.button>
                    <m.button
                      whileTap={isMobile ? undefined : { scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      onClick={onCancelDelete}
                      disabled={isProcessing}
                      className='flex-1 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-800 transition-colors dark:bg-[#161617] dark:text-gray-200'>
                      Cancel
                    </m.button>
                  </div>
                </div>
              </m.div>
            ) : !showLabelManager ? (
              <ItemActions
                item={item}
                actions={actions}
                onMainAction={onMainAction}
                onTag={onTag}
                onEdit={onEdit}
                onDelete={onDelete}
                onShowLabelManager={onShowLabelManager}
                isProcessing={isProcessing}
              />
            ) : (
              <LabelManager item={item} onClose={onCloseLabelManager} />
            )}
          </m.div>
        )}

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
      </AnimatePresence>
    )
  },
)

ItemExpandableContent.displayName = 'ItemExpandableContent'
