'use client'

import React, { ReactNode, useCallback, useMemo, useState } from 'react'

import { List, ListProps } from '@/components/ui/list'
import { useTabs } from '@/hooks/core/use-tabs'
import { useTagger } from '@/hooks/core/use-tagger'
import { FileType } from '@/model/file'
import { Item } from '@/model/item'

import { ItemListCard } from './item-list-card'

export interface ItemAction {
  id: 'open' | 'tag' | 'edit' | 'labels' | 'delete'
  label?: string
  icon?: ReactNode
  onClick?: (item: Item) => void | Promise<void>
  disabled?: (item: Item) => boolean
  hidden?: (item: Item) => boolean
}

export interface ItemListProps<T extends Item>
  extends Omit<ListProps<T>, 'renderItem' | 'actions'> {
  // Item-specific props
  onItemClick?: (item: T) => void
  onTagClick?: (item: T) => void
  onEdit?: (item: T, newName: string) => Promise<void>
  onDelete?: (item: T) => Promise<void>

  // Action configuration
  actions?: ItemAction[]
  disableActions?: ('open' | 'tag' | 'edit' | 'labels' | 'delete')[]

  // Tagging configuration
  enableTagging?: boolean

  // Custom rendering (optional)
  renderItem?: (
    item: T,
    index: number,
    options: {
      isExpanded: boolean
      onToggleExpand: () => void
    },
  ) => ReactNode

  // Additional options
  showDescription?: boolean
  showLabels?: boolean
  showTime?: boolean
  isSearchResult?: boolean
}

const ItemListComponent = <T extends Item>({
  items,
  onItemClick,
  onTagClick,
  onEdit,
  onDelete,
  actions,
  disableActions = [],
  enableTagging = true,
  renderItem: customRenderItem,
  showDescription = true,
  showLabels = true,
  showTime = true,
  isSearchResult = false,
  ...listProps
}: ItemListProps<T>) => {
  const { tagItem, untagItem, isItemTagged } = useTagger()
  const { openFileTab } = useTabs()
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // Internal tag handler - use this instead of prop drilling
  const handleInternalTagToggle = useCallback(
    (item: T) => {
      if (isItemTagged('current', item.id)) {
        untagItem('current', item.id)
      } else {
        tagItem('current', item.id, item.name)
      }
    },
    [tagItem, untagItem, isItemTagged],
  )

  // Internal open handler - opens files in tabs, delegates others to onItemClick
  const handleInternalOpen = useCallback(
    async (item: T) => {
      if (item.type === 'file') {
        // Files open in tabs - await to ensure proper state update
        await openFileTab(item.id, {
          name: item.name || 'Untitled',
          fileType:
            (item as unknown as { fileType: FileType }).fileType || 'document',
        })
      } else if (onItemClick) {
        // Other items use the provided handler
        onItemClick(item)
      }
    },
    [openFileTab, onItemClick],
  )

  // Determine which tag handler to use (prefer internal, fallback to prop for compatibility)
  const effectiveTagHandler = enableTagging
    ? handleInternalTagToggle
    : onTagClick

  // No label filtering - use items directly
  const filteredItems = items

  // Determine content type and provide appropriate empty state icon
  const getEmptyStateIcon = useCallback(() => {
    // If custom empty state icon is provided via listProps, use it
    if (listProps.emptyStateIcon) {
      return listProps.emptyStateIcon
    }

    // Determine content type from first item or title
    let contentType: 'conversation' | 'file' | 'mixed' = 'mixed'

    if (items.length > 0) {
      // Check if all items are of the same type
      const firstType = items[0].type
      const allSameType = items.every((item) => item.type === firstType)

      if (
        allSameType &&
        (firstType === 'conversation' || firstType === 'file')
      ) {
        contentType = firstType
      }
    } else {
      // Fallback: try to determine from title
      const title = listProps.title?.toLowerCase() || ''
      if (title.includes('conversation')) {
        contentType = 'conversation'
      } else if (title.includes('file')) {
        contentType = 'file'
      }
    }

    // Return appropriate icon based on content type
    switch (contentType) {
      case 'conversation':
        return (
          <svg
            className='h-12 w-12 text-gray-400 dark:text-gray-600'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
            />
          </svg>
        )
      case 'file':
        return (
          <svg
            className='h-12 w-12 text-gray-400 dark:text-gray-600'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={1.5}
              d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
            />
          </svg>
        )
      default:
        // Mixed content or unknown - use a generic folder icon
        return (
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
        )
    }
  }, [items, listProps.title, listProps.emptyStateIcon])

  // Memoize default actions to prevent recreation on every render
  const defaultActions: ItemAction[] = useMemo(
    () => [
      {
        id: 'open',
        label: 'Open',
        onClick: async (item) => await handleInternalOpen(item as T),
        hidden: (item) => item.type === 'app',
      },
      {
        id: 'tag',
        label: 'Tag',
        onClick: effectiveTagHandler
          ? (item) => effectiveTagHandler(item as T)
          : undefined,
        hidden: () => !effectiveTagHandler,
      },
      {
        id: 'edit',
        label: 'Rename',
        onClick: undefined, // Handled by card component
        hidden: (item) => !onEdit || item.type === 'app',
      },
      {
        id: 'labels',
        label: 'Labels',
        onClick: undefined, // Handled by card component
        hidden: (item) => item.type === 'app',
      },
      {
        id: 'delete',
        label: 'Delete',
        onClick: undefined, // Handled by card component
        hidden: (item) => !onDelete || item.type === 'app',
      },
    ],
    [handleInternalOpen, effectiveTagHandler, onEdit, onDelete],
  )

  // Merge custom actions with defaults - memoized for performance
  const finalActions = useMemo(() => {
    const actionsMap = new Map<string, ItemAction>()

    // Add default actions
    defaultActions.forEach((action) => {
      if (!disableActions.includes(action.id)) {
        actionsMap.set(action.id, action)
      }
    })

    // Override with custom actions
    actions?.forEach((action) => {
      if (!disableActions.includes(action.id)) {
        actionsMap.set(action.id, action)
      }
    })

    return Array.from(actionsMap.values())
  }, [defaultActions, actions, disableActions])

  // Handle item expansion
  const handleToggleExpand = useCallback((itemId: string) => {
    setExpandedItemId((prev) => (prev === itemId ? null : itemId))
  }, [])

  const defaultRenderItem = useCallback(
    (
      item: T,
      index: number,
      options: {
        isExpanded: boolean
        onToggleExpand: () => void
      },
    ) => {
      return (
        <ItemListCard
          item={item}
          actions={finalActions}
          onItemClick={
            // Pass through the click handler for all items
            onItemClick
              ? (clickedItem: Item) => onItemClick(clickedItem as T)
              : undefined
          }
          onTagClick={
            effectiveTagHandler
              ? (clickedItem: Item) => effectiveTagHandler(clickedItem as T)
              : undefined
          }
          onEdit={
            onEdit
              ? async (newName: string) => onEdit(item, newName)
              : undefined
          }
          onDelete={onDelete ? async () => onDelete(item) : undefined}
          showDescription={showDescription}
          showLabels={showLabels}
          showTime={showTime}
          isSearchResult={isSearchResult}
          isExpanded={options.isExpanded}
          onToggleExpand={options.onToggleExpand}
        />
      )
    },
    [
      finalActions,
      onItemClick,
      effectiveTagHandler,
      onEdit,
      onDelete,
      showDescription,
      showLabels,
      showTime,
      isSearchResult,
    ],
  )

  const renderItemWithExpansion = useCallback(
    (item: T, index: number) => {
      const isExpanded = expandedItemId === item.id
      const onToggleExpand = () => handleToggleExpand(item.id)

      if (customRenderItem) {
        return customRenderItem(item, index, { isExpanded, onToggleExpand })
      }

      return defaultRenderItem(item, index, { isExpanded, onToggleExpand })
    },
    [expandedItemId, handleToggleExpand, customRenderItem, defaultRenderItem],
  )

  return (
    <div className='space-y-4'>
      {/* List component */}
      <List<T>
        {...listProps}
        items={filteredItems}
        renderItem={renderItemWithExpansion}
        expandable={true}
        emptyStateIcon={getEmptyStateIcon()}
      />
    </div>
  )
}

// Export the memoized component with proper generic typing
export const ItemList = React.memo(ItemListComponent) as <T extends Item>(
  props: ItemListProps<T>,
) => JSX.Element
