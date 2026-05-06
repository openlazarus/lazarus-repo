import { Item, ItemType } from './item'
import { Tag } from './tag'

/**
 * Storage adapter interface
 */
export interface StorageAdapter {
  getItem<T>(key: string): Promise<T | null>
  setItem<T>(key: string, value: T): Promise<void>
  removeItem(key: string): Promise<void>
  getAllItems(): Promise<Record<string, any>>
}

/**
 * Repository class - manages data access with caching
 */
export class Repository {
  private cache: {
    items: Record<string, Item>
    tags: Record<string, Tag>
  }

  constructor(private storageAdapter: StorageAdapter) {
    this.cache = {
      items: {},
      tags: {},
    }

    // Initialize cache on creation
    this.initializeCache()
  }

  /**
   * Initialize the cache from storage
   */
  private async initializeCache(): Promise<void> {
    try {
      const storedItems =
        (await this.storageAdapter.getItem<Record<string, Item>>('items')) || {}
      const storedTags =
        (await this.storageAdapter.getItem<Record<string, Tag>>('tags')) || {}

      this.cache.items = storedItems
      this.cache.tags = storedTags
    } catch (error) {
      console.error('Failed to initialize repository cache:', error)
      this.cache.items = {}
      this.cache.tags = {}
    }
  }

  /**
   * Get an item by ID
   */
  async getItemById<T extends Item>(id: string): Promise<T | null> {
    // Check cache first
    if (this.cache.items[id]) {
      return this.cache.items[id] as T
    }

    // Try to get from storage
    try {
      const storedItems =
        (await this.storageAdapter.getItem<Record<string, Item>>('items')) || {}
      const item = storedItems[id]

      if (item) {
        // Update cache
        this.cache.items[id] = item
        return item as T
      }

      return null
    } catch (error) {
      console.error(`Failed to get item with ID ${id}:`, error)
      return null
    }
  }

  /**
   * Get all items of a specific type
   */
  async getAllItems<T extends Item>(type?: ItemType): Promise<T[]> {
    try {
      const storedItems =
        (await this.storageAdapter.getItem<Record<string, Item>>('items')) || {}

      // Update cache
      this.cache.items = {
        ...this.cache.items,
        ...storedItems,
      }

      // Filter by type if specified
      const items = Object.values(storedItems)
      if (type) {
        return items.filter((item) => item.type === type) as T[]
      }

      return items as T[]
    } catch (error) {
      console.error('Failed to get all items:', error)
      return []
    }
  }

  /**
   * Save an item
   */
  async saveItem<T extends Item>(item: T): Promise<T> {
    try {
      const storedItems =
        (await this.storageAdapter.getItem<Record<string, Item>>('items')) || {}

      // Update with new item
      const updatedItems = {
        ...storedItems,
        [item.id]: {
          ...item,
          updatedAt: new Date().toISOString(),
        },
      }

      // Save to storage
      await this.storageAdapter.setItem('items', updatedItems)

      // Update cache
      this.cache.items = updatedItems

      return updatedItems[item.id] as T
    } catch (error) {
      console.error(`Failed to save item with ID ${item.id}:`, error)
      return item
    }
  }

  async updateItem<T extends Item>(id: string, item: Partial<T>): Promise<T> {
    try {
      const storedItems =
        (await this.storageAdapter.getItem<Record<string, Item>>('items')) || {}

      const existingItem = storedItems[id]
      if (!existingItem) {
        throw new Error(`Item with ID ${id} not found`)
      }

      const updatedItems = {
        ...storedItems,
        [id]: {
          ...existingItem,
          ...item,
        },
      }

      await this.storageAdapter.setItem('items', updatedItems)

      this.cache.items = updatedItems

      return updatedItems[id] as T
    } catch (error) {
      console.error(`Failed to update item with ID ${id}:`, error)
      return item as T
    }
  }

  /**
   * Delete an item
   */
  async deleteItem(id: string): Promise<boolean> {
    try {
      const storedItems =
        (await this.storageAdapter.getItem<Record<string, Item>>('items')) || {}

      // Remove the item
      if (storedItems[id]) {
        delete storedItems[id]

        // Save to storage
        await this.storageAdapter.setItem('items', storedItems)

        // Update cache
        this.cache.items = storedItems

        // Also remove any tags related to this item
        await this.deleteTagsForItem(id)

        return true
      }

      return false
    } catch (error) {
      console.error(`Failed to delete item with ID ${id}:`, error)
      return false
    }
  }

  /**
   * Get all tags
   */
  async getAllTags(): Promise<Tag[]> {
    try {
      const storedTags =
        (await this.storageAdapter.getItem<Record<string, Tag>>('tags')) || {}

      // Update cache
      this.cache.tags = storedTags

      return Object.values(storedTags)
    } catch (error) {
      console.error('Failed to get all tags:', error)
      return []
    }
  }

  /**
   * Get tags by source item ID
   */
  async getTagsBySourceId(sourceId: string): Promise<Tag[]> {
    try {
      const allTags = await this.getAllTags()
      return allTags.filter((tag) => tag.sourceId === sourceId)
    } catch (error) {
      console.error(`Failed to get tags for source ID ${sourceId}:`, error)
      return []
    }
  }

  /**
   * Get tags by target item ID
   */
  async getTagsByTargetId(targetId: string): Promise<Tag[]> {
    try {
      const allTags = await this.getAllTags()
      return allTags.filter((tag) => tag.targetId === targetId)
    } catch (error) {
      console.error(`Failed to get tags for target ID ${targetId}:`, error)
      return []
    }
  }

  /**
   * Save a tag
   */
  async saveTag(tag: Tag): Promise<Tag> {
    try {
      const storedTags =
        (await this.storageAdapter.getItem<Record<string, Tag>>('tags')) || {}

      // Update with new tag
      const updatedTags = {
        ...storedTags,
        [tag.id]: tag,
      }

      // Save to storage
      await this.storageAdapter.setItem('tags', updatedTags)

      // Update cache
      this.cache.tags = updatedTags

      return tag
    } catch (error) {
      console.error(`Failed to save tag with ID ${tag.id}:`, error)
      return tag
    }
  }

  /**
   * Delete a tag
   */
  async deleteTag(id: string): Promise<boolean> {
    try {
      const storedTags =
        (await this.storageAdapter.getItem<Record<string, Tag>>('tags')) || {}

      // Remove the tag
      if (storedTags[id]) {
        delete storedTags[id]

        // Save to storage
        await this.storageAdapter.setItem('tags', storedTags)

        // Update cache
        this.cache.tags = storedTags

        return true
      }

      return false
    } catch (error) {
      console.error(`Failed to delete tag with ID ${id}:`, error)
      return false
    }
  }

  /**
   * Delete all tags related to an item (as source or target)
   */
  async deleteTagsForItem(itemId: string): Promise<boolean> {
    try {
      const storedTags =
        (await this.storageAdapter.getItem<Record<string, Tag>>('tags')) || {}

      // Find tags related to the item
      const updatedTags = { ...storedTags }
      let hasChanges = false

      Object.keys(updatedTags).forEach((tagId) => {
        const tag = updatedTags[tagId]
        if (tag.sourceId === itemId || tag.targetId === itemId) {
          delete updatedTags[tagId]
          hasChanges = true
        }
      })

      if (hasChanges) {
        // Save to storage
        await this.storageAdapter.setItem('tags', updatedTags)

        // Update cache
        this.cache.tags = updatedTags
      }

      return hasChanges
    } catch (error) {
      console.error(`Failed to delete tags for item with ID ${itemId}:`, error)
      return false
    }
  }

  /**
   * Clear the repository cache
   */
  async clear(): Promise<void> {
    this.cache.items = {}
    this.cache.tags = {}
    await this.storageAdapter.setItem('items', {})
    await this.storageAdapter.setItem('tags', {})
    await this.storageAdapter.setItem('labels', {})
    await this.storageAdapter.setItem('item_labels', {})
  }
}
