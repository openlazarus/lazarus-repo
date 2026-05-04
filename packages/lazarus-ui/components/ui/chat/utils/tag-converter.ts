import { App } from '@/model/app'
import { Conversation } from '@/model/conversation'
import { File } from '@/model/file'
import { Item } from '@/model/item'

import { MessageTag } from '../types'

/**
 * Convert an Item to a MessageTag for use in chat messages
 */
export function itemToMessageTag(item: Item): MessageTag {
  const baseTag: MessageTag = {
    id: item.id,
    type: item.type as 'app' | 'file' | 'conversation',
    name: item.name,
    icon: item.icon,
    updatedAt: new Date(item.updatedAt),
  }

  // Add type-specific properties
  if (item.type === 'file') {
    const fileItem = item as File
    return {
      ...baseTag,
      fileType: fileItem.fileType,
      preview: fileItem.preview || undefined,
    }
  }

  if (item.type === 'app') {
    const appItem = item as App
    return {
      ...baseTag,
      app_type: appItem.app_type,
    }
  }

  if (item.type === 'conversation') {
    const conversationItem = item as Conversation
    return {
      ...baseTag,
      title: conversationItem.title,
    }
  }

  return baseTag
}

/**
 * Convert an array of Items to MessageTags
 */
export function itemsToMessageTags(items: Item[]): MessageTag[] {
  return items.map(itemToMessageTag)
}
