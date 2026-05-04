'use client'

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

import { useDebounce } from '@/hooks/utils/use-debounce'
import { Item } from '@/model/item'
import { ItemLabel, Label } from '@/model/label'
import { LocalStorageAdapter } from '@/model/local-storage'
import { Repository } from '@/model/repository'
import { Tag } from '@/model/tag'
import { useIdentity } from '@/state/identity'

// Keys for storing in localStorage
const TAGS_STORAGE_KEY = 'tags'
const LABELS_STORAGE_KEY = 'labels'
const ITEM_LABELS_STORAGE_KEY = 'item_labels'

/**
 * Store context value type
 */
export interface StoreContextValue {
  // State
  items: Record<string, Item>
  tags: Record<string, Tag>
  labels: Record<string, Label>
  itemLabels: Record<string, ItemLabel>

  // Methods
  setItems: React.Dispatch<React.SetStateAction<Record<string, Item>>>
  setTags: React.Dispatch<React.SetStateAction<Record<string, Tag>>>
  setLabels: React.Dispatch<React.SetStateAction<Record<string, Label>>>
  setItemLabels: React.Dispatch<React.SetStateAction<Record<string, ItemLabel>>>

  // Repository instance
  repository: Repository

  // Loading state
  loading: boolean

  // Current active workspace
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string) => void
}

// Create context with a default value
const StoreContext = createContext<StoreContextValue | null>(null)

/**
 * Hook to use the store context
 */
export function useStore(): StoreContextValue {
  const context = useContext(StoreContext)

  if (!context) {
    throw new Error('useStore must be used within a StoreProvider')
  }

  return context
}

/**
 * Hook to get only repository and workspace info without subscribing to items state
 * This prevents re-renders when items change
 */
export function useStoreEssentials() {
  const context = useContext(StoreContext)

  if (!context) {
    throw new Error('useStoreEssentials must be used within a StoreProvider')
  }

  // Return only the essentials, not the items state
  return {
    // TODO: Revise this (Respository necessary?)
    repository: context.repository,
    activeWorkspaceId: context.activeWorkspaceId,
    setActiveWorkspaceId: context.setActiveWorkspaceId,
  }
}

/**
 * Hook to get only loading state without subscribing to other state changes
 */
export function useStoreLoading() {
  const context = useContext(StoreContext)

  if (!context) {
    throw new Error('useStoreLoading must be used within a StoreProvider')
  }

  return context.loading
}

/**
 * Store provider props
 */
interface StoreProviderProps {
  children: ReactNode
}

/**
 * Store provider component
 */
export function StoreProvider({
  children,
}: StoreProviderProps): React.JSX.Element {
  // Use Identity state for workspace selection (single source of truth)
  const { activeWorkspaceId, setActiveWorkspaceId } = useIdentity()

  // Initialize state for items and tags
  const [items, setItems] = useState<Record<string, Item>>({})
  const [tags, setTags] = useState<Record<string, Tag>>({})
  const [labels, setLabels] = useState<Record<string, Label>>({})
  const [itemLabels, setItemLabels] = useState<Record<string, ItemLabel>>({})
  const [loading, setLoading] = useState(true)

  // Add debounced versions of state for expensive operations using existing hook
  const debouncedTags = useDebounce(tags, 500)
  const debouncedLabels = useDebounce(labels, 500)
  const debouncedItemLabels = useDebounce(itemLabels, 500)

  // Create enhanced repository instance with caching
  const [repository] = useState(() => new Repository(new LocalStorageAdapter()))
  const [storageAdapter] = useState(() => new LocalStorageAdapter())

  // Migrate legacy workspace ID from old localStorage key
  useEffect(() => {
    const legacyKey = 'lazarus:active-workspace-id'
    const legacyValue = localStorage.getItem(legacyKey)

    // If we have a legacy value and no Identity workspace set, migrate it
    if (legacyValue && !activeWorkspaceId) {
      console.log(
        '[Migration] Migrating workspace ID from legacy Store key to Identity state',
      )
      setActiveWorkspaceId(legacyValue)
      localStorage.removeItem(legacyKey)
    }
  }, []) // Run once on mount

  // Load initial data from repository
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoading(true)

        // Load all items from local storage
        const allItems = await repository.getAllItems()
        const itemsMap: Record<string, Item> = {}

        allItems.forEach((item) => {
          itemsMap[item.id] = item
        })

        setItems(itemsMap)

        // Load all tags from repository
        const allTags = await repository.getAllTags()
        const tagsMap: Record<string, Tag> = {}

        allTags.forEach((tag) => {
          tagsMap[tag.id] = tag
        })

        // Also load ephemeral tags from localStorage
        const storedTags =
          await storageAdapter.getItem<Record<string, Tag>>(TAGS_STORAGE_KEY)
        if (storedTags) {
          // Merge with tags from repository
          setTags({ ...tagsMap, ...storedTags })
        } else {
          setTags(tagsMap)
        }

        // Load labels from localStorage
        const storedLabels =
          await storageAdapter.getItem<Record<string, Label>>(
            LABELS_STORAGE_KEY,
          )
        if (storedLabels) {
          setLabels(storedLabels)
        }

        // Load item-label associations from localStorage
        const storedItemLabels = await storageAdapter.getItem<
          Record<string, ItemLabel>
        >(ITEM_LABELS_STORAGE_KEY)
        if (storedItemLabels) {
          setItemLabels(storedItemLabels)
        }
      } catch (error) {
        console.error('Failed to load initial data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadInitialData()
  }, [repository, storageAdapter])

  // Debounced save function to prevent excessive saves
  const saveItemsToRepository = useCallback(
    async (itemsToSave: Record<string, Item>) => {
      try {
        // Saving items to local storage

        // Get existing items from storage to compare
        const storedItems = await repository.getAllItems<Item>()
        const storedItemsMap: Record<string, Item> = {}
        storedItems.forEach((item) => {
          storedItemsMap[item.id] = item
        })

        // Save each item that has changed or is new
        const savePromises = Object.values(itemsToSave).map(async (item) => {
          const storedItem = storedItemsMap[item.id]

          // Only save if the item is new or has changed
          if (
            !storedItem ||
            JSON.stringify(storedItem) !== JSON.stringify(item)
          ) {
            await repository.saveItem(item)
          }
        })

        await Promise.all(savePromises)
      } catch (error) {
        console.error('Failed to save items to repository:', error)
      }
    },
    [repository],
  )

  // Save items to repository when they change (with debouncing)
  useEffect(() => {
    // Skip saving during initial loading
    if (loading) return

    // Skip if items is empty
    if (Object.keys(items).length === 0) return

    // Debounce the save operation
    const timeoutId = setTimeout(() => {
      saveItemsToRepository(items)
    }, 1000) // 1 second debounce

    return () => clearTimeout(timeoutId)
  }, [items, loading, saveItemsToRepository])

  // Save tags to localStorage when they change - now debounced
  useEffect(() => {
    // Skip saving during initial loading
    if (loading) return

    // Find ephemeral tags (those with sourceId 'current')
    const ephemeralTags: Record<string, Tag> = {}
    Object.values(debouncedTags).forEach((tag) => {
      if (tag.sourceId === 'current') {
        ephemeralTags[tag.id] = tag
      }
    })

    // Only save ephemeral tags to localStorage - make async
    const saveEphemeralTags = async () => {
      try {
        // Use setTimeout to defer to next tick
        setTimeout(async () => {
          await storageAdapter.setItem(TAGS_STORAGE_KEY, ephemeralTags)
          // Saved ephemeral tags to localStorage
        }, 0)
      } catch (error) {
        console.error('Failed to save ephemeral tags to localStorage:', error)
      }
    }

    // Save regular tags to repository - make async
    const saveTagsToRepository = async () => {
      try {
        // Find non-ephemeral tags
        const repositoryTags = Object.values(debouncedTags).filter(
          (tag) => tag.sourceId !== 'current',
        )

        // Use setTimeout to defer to next tick
        setTimeout(async () => {
          const savePromises = repositoryTags.map(async (tag) => {
            await repository.saveTag(tag)
          })
          await Promise.all(savePromises)
        }, 0)
      } catch (error) {
        console.error('Failed to save tags to repository:', error)
      }
    }

    // Perform both save operations
    saveEphemeralTags()
    saveTagsToRepository()
  }, [debouncedTags, repository, storageAdapter, loading])

  // Save labels to localStorage when they change - now debounced
  useEffect(() => {
    // Skip saving during initial loading
    if (loading) return

    const saveLabels = async () => {
      try {
        // Use setTimeout to defer to next tick
        setTimeout(async () => {
          await storageAdapter.setItem(LABELS_STORAGE_KEY, debouncedLabels)
        }, 0)
      } catch (error) {
        console.error('Failed to save labels to localStorage:', error)
      }
    }

    saveLabels()
  }, [debouncedLabels, storageAdapter, loading])

  // Save item-label associations to localStorage when they change - now debounced
  useEffect(() => {
    // Skip saving during initial loading
    if (loading) return

    const saveItemLabels = async () => {
      try {
        // Use setTimeout to defer to next tick
        setTimeout(async () => {
          await storageAdapter.setItem(
            ITEM_LABELS_STORAGE_KEY,
            debouncedItemLabels,
          )
        }, 0)
      } catch (error) {
        console.error(
          'Failed to save item-label associations to localStorage:',
          error,
        )
      }
    }

    saveItemLabels()
  }, [debouncedItemLabels, storageAdapter, loading])

  // Create context value
  const value: StoreContextValue = useMemo(
    () => ({
      items,
      tags,
      labels,
      itemLabels,
      setItems,
      setTags,
      setLabels,
      setItemLabels,
      repository,
      loading,
      activeWorkspaceId,
      setActiveWorkspaceId,
    }),
    [
      items,
      tags,
      labels,
      itemLabels,
      setItems,
      setTags,
      setLabels,
      setItemLabels,
      repository,
      loading,
      activeWorkspaceId,
      setActiveWorkspaceId,
    ],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export default StoreContext
