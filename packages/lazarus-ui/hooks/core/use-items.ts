'use client'

import { useCallback, useEffect, useState } from 'react'

import { App, createApp } from '@/model/app'
import { Conversation, createConversation } from '@/model/conversation'
import { File, createFile } from '@/model/file'
import { Item, ItemType } from '@/model/item'
import { Message, createMessage } from '@/model/message'
import { useStore } from '@/state/store'

/**
 * Hook for working with items from the store
 */
export function useItems<T extends Item>(type?: ItemType) {
  const { items, setItems, repository, loading } = useStore()
  const [loadingItems, setLoadingItems] = useState(loading)

  // Filter items by type if specified
  const filteredItems = type
    ? (Object.values(items).filter((item) => item.type === type) as T[])
    : (Object.values(items) as T[])

  // Load items on mount
  useEffect(() => {
    const loadItems = async () => {
      try {
        setLoadingItems(true)
        const allItems = await repository.getAllItems<T>(type)

        // Update items in store
        if (allItems.length > 0) {
          const itemsMap: Record<string, Item> = {}
          allItems.forEach((item) => {
            itemsMap[item.id] = item
          })

          setItems((prev) => ({
            ...prev,
            ...itemsMap,
          }))
        }
      } catch (error) {
        console.error('Failed to load items:', error)
      } finally {
        setLoadingItems(false)
      }
    }

    loadItems()
  }, [repository, setItems, type])

  // Get an item by ID
  const getItemById = useCallback(
    async (id: string): Promise<T | null> => {
      try {
        // Check if in current state
        if (items[id]) {
          return items[id] as T
        }

        // Otherwise try repository
        const item = await repository.getItemById<T>(id)

        if (item) {
          // Update state
          setItems((prev) => ({
            ...prev,
            [item.id]: item,
          }))
        }

        return item
      } catch (error) {
        console.error(`Failed to get item with ID ${id}:`, error)
        return null
      }
    },
    [items, repository, setItems],
  )

  // Create a new item
  const createItem = useCallback(
    async <I extends Item>(
      itemType: ItemType,
      data: Partial<I> = {},
    ): Promise<I> => {
      try {
        let newItem: I

        // Create appropriate item type
        switch (itemType) {
          case 'conversation':
            newItem = createConversation(
              data as Partial<Conversation>,
            ) as unknown as I
            break
          case 'message':
            newItem = createMessage(data as Partial<Message>) as unknown as I
            break
          case 'file':
            newItem = createFile(data as Partial<File>) as unknown as I
            break
          case 'app':
            newItem = createApp(data as Partial<App>) as unknown as I
            break
          default:
            throw new Error(`Unsupported item type: ${itemType}`)
        }

        // Save to repository
        const savedItem = await repository.saveItem<I>(newItem)

        // Update state
        setItems((prev) => ({
          ...prev,
          [savedItem.id]: savedItem,
        }))

        return savedItem
      } catch (error) {
        console.error('Failed to create item:', error)
        throw error
      }
    },
    [repository, setItems],
  )

  // Update an item
  const updateItem = useCallback(
    async (id: string, updates: Partial<T>): Promise<T | null> => {
      try {
        // Get current item
        const currentItem = items[id] as T

        if (!currentItem) {
          throw new Error(`Item with ID ${id} not found`)
        }

        // Create updated item
        const updatedItem: T = {
          ...currentItem,
          ...updates,
          updatedAt: new Date().toISOString(),
        }

        // Save to repository
        const savedItem = await repository.saveItem<T>(updatedItem)

        // Update state
        setItems((prev) => ({
          ...prev,
          [savedItem.id]: savedItem,
        }))

        return savedItem
      } catch (error) {
        console.error(`Failed to update item with ID ${id}:`, error)
        return null
      }
    },
    [items, repository, setItems],
  )

  // Delete an item
  const deleteItem = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        // Delete from repository
        const success = await repository.deleteItem(id)

        if (success) {
          // Update state
          setItems((prev) => {
            const updated = { ...prev }
            delete updated[id]
            return updated
          })
        }

        return success
      } catch (error) {
        console.error(`Failed to delete item with ID ${id}:`, error)
        return false
      }
    },
    [repository, setItems],
  )

  return {
    items: filteredItems,
    loading: loadingItems,
    getItemById,
    createItem,
    updateItem,
    deleteItem,
  }
}
