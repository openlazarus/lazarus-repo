'use client'

import * as m from 'motion/react-m'
import { memo, useCallback, useMemo, useState } from 'react'

import { useTagger } from '@/hooks/core/use-tagger'
import { formatRelativeTime } from '@/lib/date-formatter'
import { App, Item } from '@/model'
import { PlanType } from '@/model/user-profile'
import { useUIState } from '@/state/ui-state'

import { EditMode } from './edit-mode'
import { ItemDetails } from './item-details'
import { ItemExpandableContent } from './item-expandable-content'
import { ItemIcon } from './item-icon'

import { ItemAction } from './index'

interface ItemListCardProps {
  item: Item
  actions: ItemAction[]
  onItemClick?: (item: Item) => void
  onTagClick?: (item: Item) => void
  onEdit?: (newName: string) => Promise<void>
  onDelete?: () => Promise<void>
  showDescription?: boolean
  showLabels?: boolean
  showTime?: boolean
  isSearchResult?: boolean
  isExpanded: boolean
  onToggleExpand: () => void
}

export const ItemListCard = memo(
  ({
    item,
    actions,
    onItemClick,
    onTagClick,
    onEdit,
    onDelete,
    showDescription = true,
    showLabels = true,
    showTime = true,
    isSearchResult: _isSearchResult = false,
    isExpanded,
    onToggleExpand,
  }: ItemListCardProps) => {
    const { isItemTagged } = useTagger()
    const [isEditing, setIsEditing] = useState(false)
    const [editedName, setEditedName] = useState('')
    const [deleteConfirmation, setDeleteConfirmation] = useState(false)
    const [showLabelManager, setShowLabelManager] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)

    // Get active conversation ID to determine current badge
    const { activeConversationId } = useUIState()

    // Determine if this conversation should show the current badge
    const showCurrentBadge = item.type === 'conversation'

    const isApp = item.type === 'app'
    const isTagged = isItemTagged('current', item.id)

    // Memoize tag action lookup to prevent repeated array searches
    const tagAction = useMemo(
      () => actions.find((action) => action.id === 'tag'),
      [actions],
    )

    // Handle click - don't expand apps, just trigger click action
    // For files and other items, expand to show actions
    const handleCardClick = useCallback(
      (e: React.MouseEvent) => {
        if (isApp && onItemClick) {
          e.stopPropagation()
          onItemClick(item)
        } else {
          // Expand all non-app items (including files) to show actions
          onToggleExpand()
        }
      },
      [isApp, item, onItemClick, onToggleExpand],
    )

    // Handle edit mode
    const handleStartEdit = useCallback(() => {
      if (!onEdit) return
      setIsEditing(true)
      setEditedName(item.name || '')

      // Close expansion when starting edit
      if (isExpanded) {
        onToggleExpand()
      }
    }, [item.name, onEdit, isExpanded, onToggleExpand])

    const handleSaveEdit = useCallback(async () => {
      if (!onEdit || !editedName.trim() || isProcessing) return

      setIsProcessing(true)
      try {
        await onEdit(editedName.trim())
        setIsEditing(false)
        setEditedName('')
      } catch (error) {
        console.error('Failed to save edit:', error)
      } finally {
        setIsProcessing(false)
      }
    }, [editedName, onEdit, isProcessing])

    const handleCancelEdit = useCallback(() => {
      setIsEditing(false)
      setEditedName('')
    }, [])

    // Handle delete
    const handleDelete = useCallback(async () => {
      if (!onDelete || isProcessing) return

      setIsProcessing(true)
      try {
        await onDelete()
      } catch (error) {
        console.error('Failed to delete:', error)
        setDeleteConfirmation(false)
      } finally {
        setIsProcessing(false)
      }
    }, [onDelete, isProcessing])

    // Handle main action (open/connect)
    const handleMainAction = useCallback(() => {
      if (onItemClick) {
        onItemClick(item)
      }
    }, [onItemClick, item])

    // Handle tag action - use memoized action
    const handleTagAction = useCallback(() => {
      if (tagAction?.onClick) {
        tagAction.onClick(item)
      }
    }, [tagAction, item])

    // Determine if we should use tap animation - memoized
    const shouldAnimateTap = useMemo(
      () =>
        !isExpanded && typeof window !== 'undefined' && window.innerWidth > 768,
      [isExpanded],
    )

    // Memoize formatted time to prevent repeated calculations
    const formattedTime = useMemo(
      () => (showTime && !isApp ? formatRelativeTime(item.updatedAt) : null),
      [showTime, isApp, item.updatedAt],
    )

    return (
      <m.div
        onClick={handleCardClick}
        whileTap={
          shouldAnimateTap
            ? { scale: 0.98, transition: { duration: 0.1 } }
            : undefined
        }
        className='group relative flex cursor-pointer flex-col'>
        {/* Card content */}
        <div className='flex items-start gap-3 px-4 py-3'>
          <ItemIcon item={item} />

          <div className='min-w-0 flex-1'>
            {isEditing ? (
              <EditMode
                value={editedName}
                onChange={setEditedName}
                onSave={handleSaveEdit}
                onCancel={handleCancelEdit}
              />
            ) : (
              <>
                {/* Header */}
                <div className='mb-1 flex items-center justify-between'>
                  <h4
                    className={`truncate text-[15px] font-medium ${
                      isTagged
                        ? 'text-[#0098FC] dark:text-[#4DB8FF]'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                    {item.name}
                  </h4>

                  {/* Time or status */}
                  {formattedTime && (
                    <span className='flex-shrink-0 text-[12px] text-gray-500 dark:text-gray-400'>
                      {formattedTime}
                    </span>
                  )}

                  {/* App status */}
                  {isApp && <ItemAppStatus item={item as App} />}
                </div>

                {/* Details */}
                {(showDescription || showLabels) && (
                  <ItemDetails
                    item={item}
                    onTagClick={
                      tagAction?.onClick ? handleTagAction : undefined
                    }
                    showCurrentBadge={showCurrentBadge}
                  />
                )}
              </>
            )}
          </div>
        </div>

        <ItemExpandableContent
          item={item}
          actions={actions}
          isExpanded={isExpanded}
          deleteConfirmation={deleteConfirmation}
          showLabelManager={showLabelManager}
          isProcessing={isProcessing}
          onMainAction={handleMainAction}
          onTag={tagAction?.onClick ? handleTagAction : undefined}
          onEdit={onEdit ? handleStartEdit : undefined}
          onDelete={onDelete ? () => setDeleteConfirmation(true) : undefined}
          onShowLabelManager={() => setShowLabelManager(true)}
          onConfirmDelete={handleDelete}
          onCancelDelete={() => setDeleteConfirmation(false)}
          onCloseLabelManager={() => setShowLabelManager(false)}
        />
      </m.div>
    )
  },
)

ItemListCard.displayName = 'ItemListCard'

// Helper components
const ItemAppStatus = memo(({ item }: { item: App }) => {
  if (item.required_plan !== PlanType.Free) {
    return (
      <span className='flex h-5 flex-shrink-0 items-center rounded-full bg-[#0098FC]/10 px-2 text-[11px] font-medium text-[#0098FC] dark:bg-[#0098FC]/20 dark:text-[#4DB8FF]'>
        Lazarus+
      </span>
    )
  } else if (item.is_connected) {
    return (
      <span className='flex h-5 flex-shrink-0 items-center rounded-full bg-[#0098FC]/10 px-2 text-[11px] font-medium text-[#0098FC] dark:bg-[#0098FC]/20 dark:text-[#4DB8FF]'>
        Connected
      </span>
    )
  } else if (item.is_connecting) {
    return (
      <span className='flex h-5 flex-shrink-0 items-center rounded-full bg-gray-50 px-2 text-[11px] font-medium text-gray-500 dark:bg-white/[0.03] dark:text-gray-400'>
        Connecting...
      </span>
    )
  }
  return null
})

ItemAppStatus.displayName = 'ItemAppStatus'
