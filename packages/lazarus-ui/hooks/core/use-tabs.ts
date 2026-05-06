import React, { useMemo } from 'react'

import { useFileTabActions } from '@/hooks/core/use-file-tab-actions'
import {
  useActiveFileTab,
  useActiveFileTabId,
  useFileTabs,
} from '@/hooks/core/use-file-tabs'
import { getFileTypeIconComponent } from '@/lib/file-icons'
import { FileType } from '@/model/file'

export interface Tab {
  id: string
  fileId: string
  order: number
  openedAt: Date
  lastAccessedAt: Date
  isPinned?: boolean
  fileInfo?: {
    name: string
    fileType: FileType
    icon: string | React.ReactElement | (() => React.ReactElement)
    scope?: string
    scopeId?: string
  }
}

// Minimal file type for tab display
interface TabFile {
  id: string
  type: 'file'
  name: string
  fileType: FileType
  icon: string | React.ReactElement | (() => React.ReactElement)
  path?: string
  workspaceId?: string
  metadata?: Record<string, any>
  createdAt?: string
  updatedAt?: string
}

/**
 * Hook for managing open file tabs in the workspace
 * Each tab represents an open file in preview mode
 * Only files can be opened in tabs (documents, spreadsheets, presentations, etc.)
 *
 * Now uses Zustand store for optimal performance
 */
export function useTabs() {
  // Use Zustand hooks for file tabs
  const tabs = useFileTabs()
  const activeTab = useActiveFileTab()
  const activeTabId = useActiveFileTabId()
  const {
    openFileTab: openFileTabAction,
    closeTab: closeTabAction,
    closeAllTabs: closeAllTabsAction,
    switchToTab: switchToTabAction,
    togglePinTab: togglePinTabAction,
    reorderTabs: reorderTabsAction,
    reorderTabsFromArray: reorderTabsFromArrayAction,
    setActiveTabId,
  } = useFileTabActions()

  // Get all open tabs sorted by order (already sorted from hook)
  const openTabs = tabs

  // Get files for all open tabs - now using fileInfo
  const openFiles = useMemo(() => {
    return openTabs.map(
      (tab) =>
        ({
          id: tab.fileId,
          type: 'file' as const,
          name: tab.fileInfo?.name || 'Untitled',
          fileType: tab.fileInfo?.fileType || 'document',
          icon: tab.fileInfo?.icon || getFileTypeIconComponent('document'),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }) as TabFile,
    )
  }, [openTabs])

  // Get the active file - now using fileInfo
  const activeFile = useMemo(() => {
    if (!activeTab) return null
    return {
      id: activeTab.fileId,
      type: 'file' as const,
      name: activeTab.fileInfo?.name || 'Untitled',
      fileType: activeTab.fileInfo?.fileType || 'document',
      icon: activeTab.fileInfo?.icon || getFileTypeIconComponent('document'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as TabFile
  }, [activeTab])

  // Open a new tab for a file
  const openFileTab = async (
    fileId: string,
    fileInfo?: {
      name: string
      fileType: FileType
      scope?: string
      scopeId?: string
      icon?: React.ReactElement
    },
  ): Promise<Tab | null> => {
    return openFileTabAction(fileId, fileInfo)
  }

  // Close a tab
  const closeTab = (tabId: string, force: boolean = false): boolean => {
    return closeTabAction(tabId, force)
  }

  // Close all tabs except pinned ones
  const closeAllTabs = (includePinned: boolean = false) => {
    closeAllTabsAction(includePinned)
  }

  // Check if a file has an open tab
  const isFileTabOpen = (fileId: string): boolean => {
    return openTabs.some((tab) => tab.fileId === fileId)
  }

  // Get tab for a file
  const getTabForFile = (fileId: string): Tab | null => {
    return openTabs.find((tab) => tab.fileId === fileId) || null
  }

  // Pin/unpin a tab
  const togglePinTab = (tabId: string) => {
    togglePinTabAction(tabId)
  }

  // Reorder tabs (for drag and drop)
  const reorderTabs = (tabId: string, newOrder: number) => {
    reorderTabsAction(tabId, newOrder)
  }

  // Reorder tabs from array (for drag and drop with full array)
  const reorderTabsFromArray = (orderedTabIds: string[]) => {
    reorderTabsFromArrayAction(orderedTabIds)
  }

  // Switch to a specific tab
  const switchToTab = (tabId: string) => {
    switchToTabAction(tabId)
  }

  // Get file for a tab - now using fileInfo
  const getFileForTab = async (tabId: string): Promise<TabFile | null> => {
    const tab = openTabs.find((t) => t.id === tabId)
    if (!tab) return null

    return {
      id: tab.fileId,
      type: 'file' as const,
      name: tab.fileInfo?.name || 'Untitled',
      fileType: tab.fileInfo?.fileType || 'document',
      icon: tab.fileInfo?.icon || getFileTypeIconComponent('document'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  return {
    // Tab management
    tabs: openTabs,
    activeTab,
    activeTabId,
    openFileTab,
    closeTab,
    closeAllTabs,
    isFileTabOpen,
    getTabForFile,
    togglePinTab,
    reorderTabs,
    reorderTabsFromArray,
    switchToTab,
    // File access
    openFiles,
    activeFile,
    getFileForTab,
  }
}
