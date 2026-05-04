import { Label } from './label'

/**
 * Core Item interface - base model for all items in the system
 */
export type ItemType =
  | 'conversation'
  | 'file'
  | 'app'
  | 'message'
  | 'date-range'
  | 'link'
  | 'source'

/**
 * Origin of an item (where it came from)
 */
export type ItemOrigin = 'app' | 'imessage' | 'whatsapp' | 'phone' | 'email'

/**
 * Data synchronization source
 */
export type SyncSource = 'lazarus-cloud' | 'gdrive' | 'icloud'

/**
 * Base item interface
 * All model types extend this base interface
 */
export interface Item {
  id: string
  type: ItemType
  name?: string
  workspaceId: string
  description?: string
  origin?: ItemOrigin
  metadata: Record<string, any>
  labels?: Label[] // Array of full label objects associated with this item
  createdAt: string
  updatedAt: string

  // UI presentation properties
  icon?: string
  iconBg?: string
  isTagged?: boolean
  isCurrent?: boolean
  size?: number
}

/**
 * Base item interface - alias for Item
 * Used by models that extend Item (Conversation, etc.)
 */
export type BaseItem = Item

/**
 * Utility function to check if an item is of a specific type
 */
export function isItemOfType<T extends Item>(
  item: Item,
  type: ItemType,
): item is T {
  return item.type === type
}

/**
 * Generate a unique ID for an item
 */
export function generateItemId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * Extract context from any item for AI usage
 */
export function getItemContextForAI(item: Item): string {
  switch (item.type) {
    case 'conversation':
      return item.metadata.content || ''
    case 'file':
      return item.metadata.content || ''
    case 'app':
      return item.description || ''
    default:
      return ''
  }
}
