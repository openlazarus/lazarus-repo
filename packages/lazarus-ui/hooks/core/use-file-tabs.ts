import { useMemo, useRef } from 'react'

import { FileTab, useFileTabStore } from '@/store/file-tab-store'

/**
 * Hook to get all tabs sorted by order
 * Uses a stable reference pattern to prevent unnecessary re-renders
 */
export function useFileTabs(): FileTab[] {
  // Subscribe to the tabs Map - this gives us a stable reference to the Map itself
  const tabs = useFileTabStore((state) => state.tabs)

  // Keep a ref to track the previous result for memoization
  const prevResultRef = useRef<FileTab[]>([])
  const prevKeysRef = useRef<string>('')

  // Compute the sorted tabs and memoize based on content, not reference
  return useMemo(() => {
    const tabsArray = Array.from(tabs.values())
    const sorted = tabsArray.sort((a, b) => a.order - b.order)

    // Create a key based on tab ids and orders to detect actual changes
    const newKeys = sorted
      .map((t) => `${t.id}:${t.order}:${t.fileInfo?.name}`)
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
 * Hook to get active tab
 * Only re-renders when active tab ID or the active tab's data changes
 */
export function useActiveFileTab(): FileTab | null {
  const activeTabId = useFileTabStore((state) => state.activeTabId)
  const tabs = useFileTabStore((state) => state.tabs)

  // Keep a ref to track the previous result
  const prevResultRef = useRef<FileTab | null>(null)
  const prevKeyRef = useRef<string>('')

  return useMemo(() => {
    if (!activeTabId) {
      prevResultRef.current = null
      prevKeyRef.current = ''
      return null
    }

    const tab = tabs.get(activeTabId)
    if (!tab) {
      prevResultRef.current = null
      prevKeyRef.current = ''
      return null
    }

    // Create a key to detect if the tab data has actually changed
    const newKey = `${tab.id}:${tab.order}:${tab.fileInfo?.name}:${tab.fileInfo?.fileType}`

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
 * Hook to get active tab ID
 * Only re-renders when active tab ID changes
 */
export function useActiveFileTabId(): string | null {
  return useFileTabStore((state) => state.activeTabId)
}

/**
 * Hook to check if a file has an open tab
 * Note: Direct selector without useCallback - Zustand handles equality properly
 */
export function useIsFileTabOpen(fileId: string): boolean {
  return useFileTabStore((state) => state.isFileTabOpen(fileId))
}

/**
 * Hook to get tab for a specific file
 * Note: Direct selector without useCallback - Zustand handles equality properly
 */
export function useTabForFile(fileId: string): FileTab | null {
  return useFileTabStore((state) => state.getTabForFile(fileId))
}

/**
 * Hook to get tab count
 */
export function useFileTabCount(): number {
  return useFileTabStore((state) => state.tabs.size)
}
