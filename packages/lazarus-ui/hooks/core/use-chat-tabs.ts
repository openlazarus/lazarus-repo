import { useMemo, useRef } from 'react'

import { ChatTab, useTabStore } from '@/store/tab-store'

/**
 * Hook to get all chat tabs sorted by order
 * Uses a stable reference pattern to prevent unnecessary re-renders
 */
export function useChatTabs(): ChatTab[] {
  // Subscribe to the tabs array
  const tabs = useTabStore((state) => state.tabs)

  // Keep a ref to track the previous result for memoization
  const prevResultRef = useRef<ChatTab[]>([])
  const prevKeysRef = useRef<string>('')

  // Compute the sorted tabs and memoize based on content, not reference
  return useMemo(() => {
    const sorted = [...tabs].sort((a, b) => a.order - b.order)

    // Create a key based on tab ids, orders, and titles to detect actual changes
    const newKeys = sorted
      .map((t) => `${t.id}:${t.order}:${t.title}:${t.conversationId}`)
      .join('|')

    // If the keys haven't changed, return the previous result to maintain reference stability
    if (newKeys === prevKeysRef.current) {
      return prevResultRef.current
    }

    prevKeysRef.current = newKeys
    prevResultRef.current = sorted
    return sorted
  }, [tabs])
}

/**
 * Hook to get the active chat tab
 * Only re-renders when active tab ID or the active tab's data changes
 */
export function useActiveChatTab(): ChatTab | undefined {
  const activeTabId = useTabStore((state) => state.activeTabId)
  const tabs = useTabStore((state) => state.tabs)

  // Keep a ref to track the previous result
  const prevResultRef = useRef<ChatTab | undefined>(undefined)
  const prevKeyRef = useRef<string>('')

  return useMemo(() => {
    if (!activeTabId) {
      prevResultRef.current = undefined
      prevKeyRef.current = ''
      return undefined
    }

    const tab = tabs.find((t) => t.id === activeTabId)
    if (!tab) {
      prevResultRef.current = undefined
      prevKeyRef.current = ''
      return undefined
    }

    // Create a key to detect if the tab data has actually changed
    const newKey = `${tab.id}:${tab.order}:${tab.title}:${tab.conversationId}:${tab.agentId}`

    // If the key hasn't changed, return the previous result
    if (newKey === prevKeyRef.current && prevResultRef.current) {
      return prevResultRef.current
    }

    prevKeyRef.current = newKey
    prevResultRef.current = tab
    return tab
  }, [activeTabId, tabs])
}

/**
 * Hook to get the active tab ID
 * Only re-renders when active tab ID changes
 */
export function useActiveChatTabId(): string | null {
  return useTabStore((state) => state.activeTabId)
}

/**
 * Hook to get chat tab actions
 * Returns stable function references
 */
export function useChatTabActions() {
  const createTab = useTabStore((state) => state.createTab)
  const closeTab = useTabStore((state) => state.closeTab)
  const switchTab = useTabStore((state) => state.switchTab)
  const updateTab = useTabStore((state) => state.updateTab)
  const linkTabToConversation = useTabStore(
    (state) => state.linkTabToConversation,
  )
  const reorderTabs = useTabStore((state) => state.reorderTabs)

  return {
    createTab,
    closeTab,
    switchTab,
    updateTab,
    linkTabToConversation,
    reorderTabs,
  }
}

/**
 * Hook to check if the tab store has been hydrated from localStorage
 * Useful for waiting before creating default tabs to avoid race conditions
 */
export function useTabStoreHydrated(): boolean {
  return useTabStore((state) => state._hasHydrated)
}
