'use client'

import {
  RiFolderLine,
  RiLinkM,
  RiMessage2Line,
  RiPlugLine,
  RiUser6Fill,
} from '@remixicon/react'
import Image from 'next/image'
import { memo, type ReactElement } from 'react'

import { getFileTypeIconComponent } from '@/lib/file-icons'
import { cn } from '@/lib/utils'
import {
  ConnectedAppType,
  getAppIcon,
  getAppIconColor,
  getAppIconType,
} from '@/model/app'
import { FileType } from '@/model/file'

import { ChatMessage, MessageTag } from '../types'

export interface TagMessageProps {
  message: ChatMessage & {
    variant: { type: 'tag'; tag: MessageTag; tags?: MessageTag[] }
  }
  onTagClick?: (tag: MessageTag) => void
  className?: string
  uiVariant?: 'mobile' | 'desktop'
  isGrouped?: boolean
  isLastInGroup?: boolean
}

// Get the appropriate icon element for a tag
const getTagIconElement = (
  tag: MessageTag,
  className: string = 'h-4 w-4',
): ReactElement => {
  // File types - use the file icon component
  if (tag.type === 'file' && tag.fileType) {
    return getFileTypeIconComponent(tag.fileType as FileType, className)
  }

  // App types - use app icon system
  if (tag.type === 'app' && tag.app_type) {
    const iconType = getAppIconType(tag.app_type as ConnectedAppType)
    const iconPath = getAppIcon(tag.app_type as ConnectedAppType)
    const iconColor = getAppIconColor(tag.app_type as ConnectedAppType)

    if (iconType === 'component') {
      return (
        <Image
          src={iconPath}
          alt={tag.name || ''}
          width={16}
          height={16}
          className={cn(className, 'opacity-70')}
        />
      )
    } else {
      return <i className={cn(iconPath, iconColor, className)} />
    }
  }

  // Directory/folder type
  if (tag.type === 'directory') {
    return <RiFolderLine className={cn(className, 'text-[#0098FC]')} />
  }

  // Conversation type
  if (tag.type === 'conversation') {
    return <RiMessage2Line className={cn(className, 'text-[#0098FC]')} />
  }

  // Source/MCP type
  if (tag.type === 'source') {
    return <RiPlugLine className={cn(className, 'text-[#0098FC]')} />
  }

  // Agent type
  if (tag.type === 'agent') {
    return <RiUser6Fill className={cn(className, 'text-[#0098FC]')} />
  }

  // Link type
  if (tag.type === 'link') {
    return <RiLinkM className={cn(className, 'text-[#0098FC]')} />
  }

  // Message type
  if (tag.type === 'message') {
    return <RiMessage2Line className={cn(className, 'text-gray-500')} />
  }

  // Default - use document icon or provided icon
  if (tag.icon) {
    return (
      <Image
        src={tag.icon}
        alt={tag.name || ''}
        width={16}
        height={16}
        className={cn(className, 'opacity-70')}
      />
    )
  }

  // Final fallback - document icon
  return getFileTypeIconComponent('document', className)
}

// Get contextual header text based on tag type and count
const getHeaderText = (tags: MessageTag[]): string => {
  if (tags.length === 0) return 'You shared items with Lazarus:'

  const firstType = tags[0].type
  const allSameType = tags.every((tag) => tag.type === firstType)

  if (allSameType) {
    switch (firstType) {
      case 'file':
        return tags.length === 1
          ? 'You shared a file with Lazarus:'
          : `You shared ${tags.length} files with Lazarus:`
      case 'conversation':
        return tags.length === 1
          ? 'You shared a conversation with Lazarus:'
          : `You shared ${tags.length} conversations with Lazarus:`
      case 'app':
        return tags.length === 1
          ? 'You requested Lazarus to perform an action on:'
          : `You requested Lazarus to perform actions on:`
      case 'directory':
        return tags.length === 1
          ? 'You shared a folder with Lazarus:'
          : `You shared ${tags.length} folders with Lazarus:`
      case 'source':
        return tags.length === 1
          ? 'You referenced a source:'
          : `You referenced ${tags.length} sources:`
      case 'agent':
        return tags.length === 1
          ? 'You asked about an agent:'
          : `You asked about ${tags.length} agents:`
      case 'link':
        return tags.length === 1
          ? 'You shared a link with Lazarus:'
          : `You shared ${tags.length} links with Lazarus:`
      case 'message':
        return tags.length === 1
          ? 'You referenced a message:'
          : `You referenced ${tags.length} messages:`
      default:
        return tags.length === 1
          ? 'You shared an item with Lazarus:'
          : `You shared ${tags.length} items with Lazarus:`
    }
  }

  return `You shared ${tags.length} items with Lazarus:`
}

/**
 * TagMessage - Shows shared items as a background action style message
 * No bubble, appears as a muted inline action
 */
export const TagMessage = memo<TagMessageProps>(
  ({
    message,
    onTagClick,
    className,
    uiVariant: _uiVariant = 'desktop',
    isGrouped: _isGrouped,
    isLastInGroup: _isLastInGroup,
  }) => {
    const { tag, tags } = message.variant
    const allTags = tags && tags.length > 0 ? tags : [tag]
    const isUser = message.role === 'user'

    const renderTagItem = (tagItem: MessageTag, index: number) => {
      return (
        <button
          key={`${tagItem.id || index}`}
          onClick={() => onTagClick?.(tagItem)}
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-1',
            'transition-colors duration-150 hover:bg-gray-50 dark:hover:bg-gray-800',
            'text-left',
            isUser ? '-mr-2' : '-mx-2',
          )}
          type='button'>
          {/* Icon container - use the centralized icon helper */}
          <div className='flex h-6 w-6 flex-shrink-0 items-center justify-center'>
            {getTagIconElement(tagItem, 'h-4 w-4')}
          </div>

          {/* Content */}
          <div
            className={cn(
              'flex min-w-0 flex-1 flex-col',
              isUser && 'text-right',
            )}>
            <span className='break-words text-[13px] font-medium text-gray-700 dark:text-gray-300'>
              {tagItem.name || tagItem.title || 'Untitled'}
            </span>
          </div>
        </button>
      )
    }

    return (
      <div
        className={cn(
          'flex px-4 py-1.5 text-sm',
          'transition-all duration-200',
          isUser ? 'justify-end' : 'justify-start',
          className,
        )}>
        <div
          className={cn(
            'flex max-w-[85%] flex-col gap-1',
            isUser && 'items-end',
          )}>
          {/* Header text */}
          <div
            className={cn(
              'break-words text-[13px] font-medium text-gray-500 dark:text-gray-400',
              isUser && 'text-right',
            )}>
            {getHeaderText(allTags)}
          </div>

          {/* Items */}
          <div
            className={cn(
              'space-y-0.5',
              isUser ? 'flex w-full flex-col items-end' : 'w-auto',
            )}>
            {allTags.map((tagItem, index) => renderTagItem(tagItem, index))}
          </div>
        </div>
      </div>
    )
  },
)

TagMessage.displayName = 'TagMessage'
