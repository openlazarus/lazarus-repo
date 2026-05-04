import { useCallback, useMemo } from 'react'

import { Item } from '@/model/item'
import { createTag, isTagBetween } from '@/model/tag'
import { useIdentity } from '@/state/identity'
import { useStore } from '@/state/store'

/**
 * Hook for managing ephemeral tags between items
 * Tags are stored in memory via the store's React state and persisted in localStorage
 */
export function useTagger() {
  const { tags, setTags, items } = useStore()
  const { profile } = useIdentity()

  // Memoize tags array to prevent unnecessary re-computations
  const tagsArray = useMemo(() => Object.values(tags), [tags])

  // Memoize items lookup for better performance
  const itemsLookup = useMemo(() => items, [items])

  // Get all items tagged by a specific item
  const getTaggedItems = useCallback(
    (itemId: string): Item[] => {
      // Find all tags where sourceId matches the itemId
      const relevantTags = tagsArray.filter((tag) => tag.sourceId === itemId)

      // Map to the actual item objects
      return relevantTags
        .map((tag) => itemsLookup[tag.targetId])
        .filter(Boolean)
    },
    [tagsArray, itemsLookup],
  )

  // Get all items that have tagged a specific item
  const getTaggingItems = useCallback(
    (itemId: string): Item[] => {
      // Find all tags where targetId matches the itemId
      const relevantTags = tagsArray.filter((tag) => tag.targetId === itemId)

      // Map to the actual item objects
      return relevantTags
        .map((tag) => itemsLookup[tag.sourceId])
        .filter(Boolean)
    },
    [tagsArray, itemsLookup],
  )

  // Tag an item - just creates an in-memory reference
  const tagItem = useCallback(
    (sourceId: string, targetId: string, displayText?: string) => {
      // Early return if profile is not available
      if (!profile?.id) {
        console.warn('Cannot create tag: profile not available')
        return null
      }

      // Check if already tagged - use memoized array
      const isAlreadyTagged = tagsArray.some((tag) =>
        isTagBetween(tag, sourceId, targetId),
      )

      if (isAlreadyTagged) {
        return null
      }

      // Create a new tag
      const newTag = createTag(sourceId, targetId, {
        taggedBy: profile.id,
        displayText,
      })

      // Update state directly - no repository save needed
      // The store will handle persisting to localStorage
      setTags((prev) => ({
        ...prev,
        [newTag.id]: newTag,
      }))

      return newTag
    },
    [tagsArray, profile?.id, setTags],
  )

  // Untag an item
  const untagItem = useCallback(
    (sourceId: string, targetId: string): boolean => {
      // Find the tag - use memoized array
      const tag = tagsArray.find((t) => isTagBetween(t, sourceId, targetId))

      if (!tag) {
        return false
      }

      // Update state directly - no repository delete needed
      // The store will handle persisting to localStorage
      setTags((prev) => {
        const updated = { ...prev }
        delete updated[tag.id]
        return updated
      })

      return true
    },
    [tagsArray, setTags],
  )

  // Check if an item is tagged by another - memoized for performance
  const isItemTagged = useCallback(
    (sourceId: string, targetId: string): boolean => {
      return tagsArray.some((tag) => isTagBetween(tag, sourceId, targetId))
    },
    [tagsArray],
  )

  // Get all current tags - already memoized
  const allTags = tagsArray

  // Clear all ephemeral tags (only 'current' source tags)
  const clearEphemeralTags = useCallback(() => {
    setTags((prev) => {
      // Filter out any tags with 'current' as sourceId
      const updated = { ...prev }
      Object.entries(updated).forEach(([id, tag]) => {
        if (tag.sourceId === 'current') {
          delete updated[id]
        }
      })
      return updated
    })
  }, [setTags])

  // Get all currently tagged items (with 'current' sourceId)
  const getCurrentTaggedItems = useCallback((): Item[] => {
    // Get all items tagged by 'current'
    return getTaggedItems('current')
  }, [getTaggedItems])

  return {
    tags: allTags,
    getTaggedItems,
    getTaggingItems,
    tagItem,
    untagItem,
    isItemTagged,
    clearAllTags: clearEphemeralTags, // Keep backward compatibility
    clearEphemeralTags,
    getCurrentTaggedItems,
  }
}
