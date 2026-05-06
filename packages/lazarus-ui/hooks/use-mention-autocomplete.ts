/**
 * Mention Autocomplete Hook
 *
 * Handles @ trigger detection, search, and mention insertion for inline mentions
 * Works with any text editor that exposes cursor position and text content
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { Item } from '@/model/item'
import {
  getQueryAfterTrigger,
  getTriggerPosition,
  serializeMention,
} from '@/utils/mention-serializer'

import {
  getWorkspaceIndex,
  SearchResult,
} from '../services/workspace-index.service'
import { useStore } from '../state/store'

export interface MentionAutocompleteState {
  isOpen: boolean
  query: string
  results: SearchResult[]
  selectedIndex: number
  triggerPosition: number | null
}

export interface UseMentionAutocompleteOptions {
  onInsert?: (mention: string, item: Item) => void
  maxResults?: number
}

export interface UseMentionAutocompleteResult {
  // State
  state: MentionAutocompleteState

  // Actions
  handleTextChange: (text: string, cursorPosition: number) => void
  selectResult: (index: number) => void
  selectNext: () => void
  selectPrevious: () => void
  close: () => void
  insertSelected: (
    text: string,
    cursorPosition: number,
  ) => {
    newText: string
    newCursorPosition: number
  } | null
}

export function useMentionAutocomplete(
  options: UseMentionAutocompleteOptions = {},
): UseMentionAutocompleteResult {
  const { onInsert, maxResults = 10 } = options
  const { items } = useStore()

  const [state, setState] = useState<MentionAutocompleteState>({
    isOpen: false,
    query: '',
    results: [],
    selectedIndex: 0,
    triggerPosition: null,
  })

  // Index workspace items
  const workspaceIndex = useMemo(() => getWorkspaceIndex(), [])

  // Rebuild index when items change or when needed
  useEffect(() => {
    if (workspaceIndex.needsRefresh()) {
      workspaceIndex.buildIndex(items)
    }
  }, [items, workspaceIndex])

  /**
   * Handle text and cursor changes
   * Detects @ trigger and opens autocomplete
   */
  const handleTextChange = useCallback(
    (text: string, cursorPosition: number) => {
      const triggerPos = getTriggerPosition(text, cursorPosition)

      if (triggerPos !== null) {
        // Found @ trigger, open autocomplete
        const query = getQueryAfterTrigger(text, cursorPosition, triggerPos)

        // Search for matching items
        const results = query
          ? workspaceIndex.search(query, maxResults)
          : workspaceIndex.getRecent(maxResults)

        setState({
          isOpen: true,
          query,
          results,
          selectedIndex: 0,
          triggerPosition: triggerPos,
        })
      } else if (state.isOpen) {
        // Trigger removed, close autocomplete
        setState((prev) => ({
          ...prev,
          isOpen: false,
          triggerPosition: null,
        }))
      }
    },
    [maxResults, workspaceIndex, state.isOpen],
  )

  /**
   * Select a result by index
   */
  const selectResult = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.max(0, Math.min(index, prev.results.length - 1)),
    }))
  }, [])

  /**
   * Select next result (down arrow)
   */
  const selectNext = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndex:
        prev.selectedIndex < prev.results.length - 1
          ? prev.selectedIndex + 1
          : 0,
    }))
  }, [])

  /**
   * Select previous result (up arrow)
   */
  const selectPrevious = useCallback(() => {
    setState((prev) => ({
      ...prev,
      selectedIndex:
        prev.selectedIndex > 0
          ? prev.selectedIndex - 1
          : prev.results.length - 1,
    }))
  }, [])

  /**
   * Close autocomplete
   */
  const close = useCallback(() => {
    setState({
      isOpen: false,
      query: '',
      results: [],
      selectedIndex: 0,
      triggerPosition: null,
    })
  }, [])

  /**
   * Insert selected mention into text
   * Returns new text and cursor position
   */
  const insertSelected = useCallback(
    (
      text: string,
      cursorPosition: number,
    ): {
      newText: string
      newCursorPosition: number
    } | null => {
      if (!state.isOpen || state.triggerPosition === null) {
        return null
      }

      const selectedResult = state.results[state.selectedIndex]
      if (!selectedResult) {
        return null
      }

      // Get the full item from store to serialize properly
      const fullItem = items[selectedResult.id]
      if (!fullItem) {
        console.error(
          '[MentionAutocomplete] Item not found in store:',
          selectedResult.id,
        )
        return null
      }

      // Serialize item to mention
      const mention = serializeMention(fullItem)

      // Remove @ and query, insert mention
      const beforeTrigger = text.slice(0, state.triggerPosition)
      const afterCursor = text.slice(cursorPosition)
      const newText = beforeTrigger + mention + ' ' + afterCursor

      // Calculate new cursor position (after mention + space)
      const newCursorPosition = beforeTrigger.length + mention.length + 1

      // Callback for external handling
      onInsert?.(mention, fullItem)

      // Close autocomplete
      close()

      return {
        newText,
        newCursorPosition,
      }
    },
    [state, items, onInsert, close],
  )

  return {
    state,
    handleTextChange,
    selectResult,
    selectNext,
    selectPrevious,
    close,
    insertSelected,
  }
}
