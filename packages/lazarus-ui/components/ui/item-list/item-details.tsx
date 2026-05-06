'use client'

import * as m from 'motion/react-m'
import { memo, useCallback, useMemo } from 'react'

import { TagButton, handleTagAction } from '@/components/ui/button/tag-button'
import { useTagger } from '@/hooks/core/use-tagger'
import { File, Item } from '@/model'
import { getConversationDisplayName } from '@/model/conversation'
import { getFileTypeDisplayName } from '@/model/file'
import { useUIState } from '@/state/ui-state'

import { hexToRgba } from './label-manager'
import { SourceInfo } from './source-indicator'

interface ItemDetailsProps {
  item: Item
  onTagClick?: () => void
  showCurrentBadge?: boolean
}

// Helper function to get item type text
const getItemTypeText = (item: Item): string => {
  switch (item.type) {
    case 'file':
      const file = item as File
      const fileType = file.fileType || 'document'
      return getFileTypeDisplayName(fileType)
    case 'conversation':
      return getConversationDisplayName()
    case 'app':
      return 'App'
    default:
      return 'Item'
  }
}

export const ItemDetails = memo(
  ({ item, onTagClick, showCurrentBadge = false }: ItemDetailsProps) => {
    const { activeConversationId } = useUIState()
    const { isItemTagged } = useTagger()

    const isTagged = isItemTagged('current', item.id)
    const isCurrent =
      item.type === 'conversation' && activeConversationId === item.id

    // Get item labels to display - use labels if available, fallback to empty array
    const itemLabelsToShow = useMemo(() => {
      if (!item.labels || item.labels.length === 0) return []
      // Get up to 3 labels to display
      return item.labels.slice(0, 3)
    }, [item.labels])

    const handleTagButtonClick = useCallback(
      (_e: React.MouseEvent) => {
        if (onTagClick && !isCurrent) {
          handleTagAction(item.id, onTagClick, isCurrent)
        }
      },
      [onTagClick, item.id, isCurrent],
    )

    const isApp = item.type === 'app'
    const showDescription = isApp && item.description

    return (
      <div
        className={`flex items-start justify-between ${showDescription ? 'pt-1' : ''}`}>
        <div className='flex min-w-0 flex-1 flex-col gap-1.5 pr-2'>
          {/* Top line: File/Conversation type and current badge */}
          {!isApp && (
            <div className='flex items-center gap-2'>
              <p
                className={`truncate text-[13px] ${isTagged ? 'text-[#0098FC]/90 dark:text-[#4DB8FF]/90' : 'text-gray-500 dark:text-gray-400'}`}>
                {getItemTypeText(item)}
              </p>
              {showCurrentBadge && isCurrent && (
                <span className='inline-flex h-4 items-center rounded-full bg-[#0098FC]/20 px-1.5 text-[10px] font-medium text-[#0098FC] dark:bg-[#0098FC]/30 dark:text-[#4DB8FF]'>
                  Current
                </span>
              )}
            </div>
          )}

          {/* Display labels if present */}
          {itemLabelsToShow.length > 0 && (
            <div className='flex flex-wrap gap-1'>
              {itemLabelsToShow.map((label, index) => (
                <m.span
                  key={label.id}
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 28,
                    mass: 0.7,
                    delay: index * 0.02,
                  }}
                  whileTap={{
                    scale: 0.98,
                    transition: { duration: 0.1 },
                  }}
                  className='inline-flex cursor-pointer items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium dark:brightness-110'
                  style={{
                    backgroundColor: `${hexToRgba(label.color, 0.15)}`,
                    color: label.color,
                  }}>
                  <m.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 600,
                      damping: 30,
                      delay: index * 0.02 + 0.1,
                    }}
                    className='h-1.5 w-1.5 rounded-full'
                    style={{ backgroundColor: label.color }}
                  />
                  {label.name}
                </m.span>
              ))}

              {item.labels && item.labels.length > 3 && (
                <m.span
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                    y: 8,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                  }}
                  transition={{
                    type: 'spring',
                    stiffness: 380,
                    damping: 28,
                    mass: 0.7,
                    delay: itemLabelsToShow.length * 0.02 + 0.05,
                  }}
                  className='inline-flex items-center rounded-full bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/[0.03] dark:text-gray-400'>
                  +{item.labels.length - 3}
                </m.span>
              )}
            </div>
          )}

          {/* For apps, show description with more space */}
          {showDescription && (
            <p
              className={`text-[13px] leading-snug text-gray-500 dark:text-gray-400 ${isApp ? 'line-clamp-3' : 'truncate'}`}>
              {item.description}
            </p>
          )}

          {/* Unified source information */}
          <SourceInfo item={item} />
        </div>

        {onTagClick && (
          <div className='flex-shrink-0'>
            <TagButton
              itemId={item.id}
              isTagged={isTagged}
              onClick={handleTagButtonClick}
              size='small'
              disabled={isCurrent}
            />
          </div>
        )}
      </div>
    )
  },
)

ItemDetails.displayName = 'ItemDetails'
