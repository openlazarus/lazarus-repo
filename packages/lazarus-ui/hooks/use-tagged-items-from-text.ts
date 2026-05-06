/**
 * Hook to extract tagged items from mentions in text
 *
 * Parses @{type:id} mentions from text and resolves them to Item objects
 * This allows TagContainer to display items that are embedded as mentions
 */

import { useMemo } from 'react'

import { Item } from '@/model/item'
import { useStore } from '@/state/store'
import { extractMentionIds } from '@/utils/mention-serializer'

export interface UseTaggedItemsFromTextOptions {
  text: string
}

export interface UseTaggedItemsFromTextResult {
  taggedItems: Item[]
  taggedItemIds: string[]
  mentionCount: number
}

/**
 * Extract tagged items from @{type:id} mentions in text
 */
export function useTaggedItemsFromText(
  text: string,
): UseTaggedItemsFromTextResult {
  const { items: storeItems } = useStore()

  const result = useMemo(() => {
    // Parse mentions from text
    const mentions = extractMentionIds(text)

    // Resolve to actual items
    const taggedItems: Item[] = []
    const taggedItemIds: string[] = []

    mentions.forEach(({ id }) => {
      const item = storeItems[id]
      if (item) {
        taggedItems.push(item)
        taggedItemIds.push(id)
      } else {
        console.warn(`[useTaggedItemsFromText] Item not found: ${id}`)
      }
    })

    return {
      taggedItems,
      taggedItemIds,
      mentionCount: mentions.length,
    }
  }, [text, storeItems])

  return result
}
