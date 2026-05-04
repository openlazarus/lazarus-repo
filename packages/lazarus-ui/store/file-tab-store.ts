import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { getFileTypeIconComponent } from '@/lib/file-icons'
import { FileType } from '@/model/file'

/**
 * File Tab represents an open file in the editor
 */
export interface FileTab {
  id: string
  fileId: string
  order: number
  openedAt: Date
  lastAccessedAt: Date
  isPinned: boolean
  fileInfo?: {
    name: string
    fileType: FileType
    icon: string | React.ReactElement | (() => React.ReactElement)
    scope?: string
    scopeId?: string
  }
}

/**
 * File Tab Store State
 */
interface FileTabStore {
  // State
  tabs: Map<string, FileTab>
  activeTabId: string | null
  currentWorkspaceId: string | null

  // Actions
  openFileTab: (
    fileId: string,
    fileInfo?: {
      name: string
      fileType: FileType
      scope?: string
      scopeId?: string
      icon?: React.ReactElement
    },
  ) => FileTab | null
  closeTab: (tabId: string, force?: boolean) => boolean
  closeAllTabs: (includePinned?: boolean) => void
  switchToTab: (tabId: string) => void
  togglePinTab: (tabId: string) => void
  reorderTabs: (tabId: string, newOrder: number) => void
  reorderTabsFromArray: (orderedTabIds: string[]) => void
  updateTabFileInfo: (
    fileId: string,
    updates: Partial<FileTab['fileInfo']>,
  ) => void
  updateTabFileId: (
    oldFileId: string,
    newFileId: string,
    newName?: string,
  ) => void
  isFileTabOpen: (fileId: string) => boolean
  getTabForFile: (fileId: string) => FileTab | null
  getTabsSortedByOrder: () => FileTab[]
  getActiveTab: () => FileTab | null
  setActiveTabId: (tabId: string | null) => void
  setWorkspaceId: (workspaceId: string | null) => void
}

/**
 * Serializable version of FileTab for localStorage persistence
 */
interface SerializableFileTab {
  id: string
  fileId: string
  order: number
  openedAt: string
  lastAccessedAt: string
  isPinned: boolean
  fileInfo?: {
    name: string
    fileType: FileType
    scope?: string
    scopeId?: string
    // Note: icon is NOT serialized
  }
}

/**
 * Storage shape for persistence
 */
interface PersistedState {
  tabs: Record<string, SerializableFileTab>
  activeTabId: string | null
  currentWorkspaceId: string | null
}

/**
 * File Tab Store
 * Manages open file tabs in the editor using Zustand for optimal performance
 */
export const useFileTabStore = create<FileTabStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tabs: new Map(),
      activeTabId: null,
      currentWorkspaceId: null,

      // Open a file tab
      openFileTab: (fileId, fileInfo) => {
        const state = get()

        // Check if tab is already open
        const existingTab = Array.from(state.tabs.values()).find(
          (tab) => tab.fileId === fileId,
        )

        if (existingTab) {
          // Make it active, update last accessed time, and refresh fileInfo if provided
          const updatedTab = {
            ...existingTab,
            lastAccessedAt: new Date(),
            ...(fileInfo
              ? {
                  fileInfo: {
                    ...existingTab.fileInfo,
                    name:
                      fileInfo.name || existingTab.fileInfo?.name || 'Untitled',
                    fileType:
                      fileInfo.fileType ||
                      existingTab.fileInfo?.fileType ||
                      'document',
                    icon:
                      fileInfo.icon ||
                      getFileTypeIconComponent(
                        fileInfo.fileType ||
                          existingTab.fileInfo?.fileType ||
                          'document',
                      ),
                    scope: fileInfo.scope ?? existingTab.fileInfo?.scope,
                    scopeId: fileInfo.scopeId ?? existingTab.fileInfo?.scopeId,
                  },
                }
              : {}),
          }
          set({
            activeTabId: existingTab.id,
            tabs: new Map(state.tabs).set(existingTab.id, updatedTab),
          })
          return updatedTab
        }

        if (!fileInfo) {
          console.error('[FileTabStore] File info required to create new tab')
          return null
        }

        // Calculate next order
        const maxOrder = Math.max(
          ...Array.from(state.tabs.values()).map((tab) => tab.order),
          -1,
        )

        // Create new tab
        const newTab: FileTab = {
          id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          fileId,
          order: maxOrder + 1,
          openedAt: new Date(),
          lastAccessedAt: new Date(),
          isPinned: false,
          fileInfo: {
            name: fileInfo.name || 'Untitled',
            fileType: fileInfo.fileType || 'document',
            icon:
              fileInfo.icon ||
              getFileTypeIconComponent(fileInfo.fileType || 'document'),
            scope: fileInfo.scope,
            scopeId: fileInfo.scopeId,
          },
        }

        const newTabs = new Map(state.tabs)
        newTabs.set(newTab.id, newTab)

        set({
          tabs: newTabs,
          activeTabId: newTab.id,
        })

        return newTab
      },

      // Close a tab
      closeTab: (tabId, force = false) => {
        const state = get()
        const tab = state.tabs.get(tabId)

        if (!tab) return false

        // Don't close pinned tabs without force
        if (tab.isPinned && !force) {
          console.warn(
            '[FileTabStore] Cannot close pinned tab without force flag',
          )
          return false
        }

        const newTabs = new Map(state.tabs)
        newTabs.delete(tabId)

        // Reorder remaining tabs
        const remainingTabs = Array.from(newTabs.values())
        remainingTabs.sort((a, b) => a.order - b.order)
        remainingTabs.forEach((tab, index) => {
          newTabs.set(tab.id, { ...tab, order: index })
        })

        // If this was the active tab, activate another one
        let newActiveTabId = state.activeTabId
        if (state.activeTabId === tabId) {
          if (remainingTabs.length > 0) {
            // Activate the next tab or the previous one
            const closedTabOrder = tab.order
            const nextTab =
              remainingTabs.find((t) => t.order > closedTabOrder) ||
              remainingTabs[remainingTabs.length - 1]
            newActiveTabId = nextTab.id
          } else {
            newActiveTabId = null
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })

        return true
      },

      // Close all tabs
      closeAllTabs: (includePinned = false) => {
        const state = get()

        const newTabs = new Map<string, FileTab>()

        if (!includePinned) {
          // Keep pinned tabs
          Array.from(state.tabs.entries()).forEach(([id, tab]) => {
            if (tab.isPinned) {
              newTabs.set(id, tab)
            }
          })
        }

        // Reorder remaining tabs
        const remainingTabs = Array.from(newTabs.values())
        remainingTabs.forEach((tab, index) => {
          newTabs.set(tab.id, { ...tab, order: index })
        })

        // If active tab was closed, activate first remaining tab
        let newActiveTabId = state.activeTabId
        if (state.activeTabId && !newTabs.has(state.activeTabId)) {
          newActiveTabId = remainingTabs.length > 0 ? remainingTabs[0].id : null
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })
      },

      // Switch to a tab
      switchToTab: (tabId) => {
        const state = get()
        const tab = state.tabs.get(tabId)

        if (!tab) return

        const newTabs = new Map(state.tabs)
        newTabs.set(tabId, {
          ...tab,
          lastAccessedAt: new Date(),
        })

        set({
          activeTabId: tabId,
          tabs: newTabs,
        })
      },

      // Toggle pin status
      togglePinTab: (tabId) => {
        const state = get()
        const tab = state.tabs.get(tabId)

        if (!tab) return

        const newTabs = new Map(state.tabs)
        newTabs.set(tabId, {
          ...tab,
          isPinned: !tab.isPinned,
        })

        set({ tabs: newTabs })
      },

      // Reorder a single tab
      reorderTabs: (tabId, newOrder) => {
        const state = get()
        const tab = state.tabs.get(tabId)

        if (!tab) return

        const oldOrder = tab.order
        const newTabs = new Map(state.tabs)

        // Update orders for affected tabs
        Array.from(newTabs.values()).forEach((t) => {
          if (t.id === tabId) {
            newTabs.set(t.id, { ...t, order: newOrder })
          } else if (
            oldOrder < newOrder &&
            t.order > oldOrder &&
            t.order <= newOrder
          ) {
            // Shift tabs down
            newTabs.set(t.id, { ...t, order: t.order - 1 })
          } else if (
            oldOrder > newOrder &&
            t.order < oldOrder &&
            t.order >= newOrder
          ) {
            // Shift tabs up
            newTabs.set(t.id, { ...t, order: t.order + 1 })
          }
        })

        set({ tabs: newTabs })
      },

      // Reorder tabs from array
      reorderTabsFromArray: (orderedTabIds) => {
        const state = get()
        const newTabs = new Map(state.tabs)

        // Update the order for each tab based on its position in the array
        orderedTabIds.forEach((tabId, index) => {
          const tab = newTabs.get(tabId)
          if (tab) {
            newTabs.set(tabId, { ...tab, order: index })
          }
        })

        set({ tabs: newTabs })
      },

      // Update file info for a tab (e.g., when file is renamed)
      updateTabFileInfo: (fileId, updates) => {
        const state = get()
        const tab = Array.from(state.tabs.values()).find(
          (t) => t.fileId === fileId,
        )

        if (!tab) return

        const newTabs = new Map(state.tabs)
        newTabs.set(tab.id, {
          ...tab,
          fileInfo: tab.fileInfo ? { ...tab.fileInfo, ...updates } : undefined,
        })

        set({ tabs: newTabs })
      },

      // Update tab's fileId (e.g., when file path changes due to rename)
      updateTabFileId: (oldFileId, newFileId, newName) => {
        const state = get()
        const tab = Array.from(state.tabs.values()).find(
          (t) => t.fileId === oldFileId,
        )

        if (!tab) return

        const newTabs = new Map(state.tabs)
        newTabs.set(tab.id, {
          ...tab,
          fileId: newFileId,
          fileInfo: tab.fileInfo
            ? { ...tab.fileInfo, name: newName || tab.fileInfo.name }
            : undefined,
        })

        set({ tabs: newTabs })
      },

      // Check if file has open tab
      isFileTabOpen: (fileId) => {
        const state = get()
        return Array.from(state.tabs.values()).some(
          (tab) => tab.fileId === fileId,
        )
      },

      // Get tab for file
      getTabForFile: (fileId) => {
        const state = get()
        return (
          Array.from(state.tabs.values()).find(
            (tab) => tab.fileId === fileId,
          ) || null
        )
      },

      // Get tabs sorted by order
      getTabsSortedByOrder: () => {
        const state = get()
        const tabsArray = Array.from(state.tabs.values())
        return tabsArray.sort((a, b) => a.order - b.order)
      },

      // Get active tab
      getActiveTab: () => {
        const state = get()
        if (!state.activeTabId) return null
        return state.tabs.get(state.activeTabId) || null
      },

      // Set active tab ID
      setActiveTabId: (tabId) => {
        set({ activeTabId: tabId })
      },

      // Set workspace ID and handle workspace switching
      setWorkspaceId: (workspaceId) => {
        const state = get()
        const oldWorkspaceId = state.currentWorkspaceId

        // If workspace hasn't changed, do nothing
        if (oldWorkspaceId === workspaceId) return

        console.log('[FileTabStore] Switching workspace:', {
          from: oldWorkspaceId,
          to: workspaceId,
        })

        // Save current tabs to old workspace's storage
        if (oldWorkspaceId) {
          const storageKey = `lazarus:file-tabs:${oldWorkspaceId}`
          const serializableTabs: Record<string, SerializableFileTab> = {}
          state.tabs.forEach((tab) => {
            serializableTabs[tab.id] = {
              id: tab.id,
              fileId: tab.fileId,
              order: tab.order,
              openedAt: tab.openedAt.toISOString(),
              lastAccessedAt: tab.lastAccessedAt.toISOString(),
              isPinned: tab.isPinned,
              fileInfo: tab.fileInfo
                ? {
                    name: tab.fileInfo.name,
                    fileType: tab.fileInfo.fileType,
                    scope: tab.fileInfo.scope,
                    scopeId: tab.fileInfo.scopeId,
                  }
                : undefined,
            }
          })

          const persisted: PersistedState = {
            tabs: serializableTabs,
            activeTabId: state.activeTabId,
            currentWorkspaceId: oldWorkspaceId,
          }

          localStorage.setItem(storageKey, JSON.stringify({ state: persisted }))
          console.log(
            `[FileTabStore] Saved ${state.tabs.size} tabs to ${storageKey}`,
          )
        }

        // Load tabs from new workspace's storage
        if (workspaceId) {
          const storageKey = `lazarus:file-tabs:${workspaceId}`
          const stored = localStorage.getItem(storageKey)

          if (stored) {
            try {
              const persisted: PersistedState = JSON.parse(stored).state
              const tabs = new Map<string, FileTab>()

              Object.entries(persisted.tabs).forEach(([id, tab]) => {
                tabs.set(id, {
                  ...tab,
                  openedAt: new Date(tab.openedAt),
                  lastAccessedAt: new Date(tab.lastAccessedAt),
                  fileInfo: tab.fileInfo
                    ? {
                        ...tab.fileInfo,
                        icon: getFileTypeIconComponent(tab.fileInfo.fileType),
                      }
                    : undefined,
                })
              })

              console.log(
                `[FileTabStore] Loaded ${tabs.size} tabs from ${storageKey}`,
              )

              set({
                tabs,
                activeTabId: persisted.activeTabId,
                currentWorkspaceId: workspaceId,
              })
            } catch (error) {
              console.error(
                `[FileTabStore] Error loading tabs for workspace ${workspaceId}:`,
                error,
              )
              set({
                tabs: new Map(),
                activeTabId: null,
                currentWorkspaceId: workspaceId,
              })
            }
          } else {
            // No stored tabs for this workspace, start fresh
            console.log(
              `[FileTabStore] No stored tabs for workspace ${workspaceId}, starting fresh`,
            )
            set({
              tabs: new Map(),
              activeTabId: null,
              currentWorkspaceId: workspaceId,
            })
          }
        } else {
          // No workspace selected, clear tabs
          set({
            tabs: new Map(),
            activeTabId: null,
            currentWorkspaceId: null,
          })
        }
      },
    }),
    {
      name: 'lazarus:file-tabs',
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null

          const persisted: PersistedState = JSON.parse(str).state

          // Convert serialized tabs back to Map with Date objects and regenerated icons
          const tabs = new Map<string, FileTab>()
          Object.entries(persisted.tabs).forEach(([id, tab]) => {
            tabs.set(id, {
              ...tab,
              openedAt: new Date(tab.openedAt),
              lastAccessedAt: new Date(tab.lastAccessedAt),
              // Regenerate icon component (can't be serialized)
              fileInfo: tab.fileInfo
                ? {
                    ...tab.fileInfo,
                    icon: getFileTypeIconComponent(tab.fileInfo.fileType),
                  }
                : undefined,
            })
          })

          return {
            state: {
              tabs,
              activeTabId: persisted.activeTabId,
              currentWorkspaceId: persisted.currentWorkspaceId || null,
            },
          }
        },
        setItem: (name, value) => {
          const state = value.state as {
            tabs: Map<string, FileTab>
            activeTabId: string | null
            currentWorkspaceId: string | null
          }

          // Convert Map to serializable format
          const serializableTabs: Record<string, SerializableFileTab> = {}
          state.tabs.forEach((tab, id) => {
            serializableTabs[id] = {
              id: tab.id,
              fileId: tab.fileId,
              order: tab.order,
              openedAt: tab.openedAt.toISOString(),
              lastAccessedAt: tab.lastAccessedAt.toISOString(),
              isPinned: tab.isPinned,
              fileInfo: tab.fileInfo
                ? {
                    name: tab.fileInfo.name,
                    fileType: tab.fileInfo.fileType,
                    scope: tab.fileInfo.scope,
                    scopeId: tab.fileInfo.scopeId,
                    // Note: icon is NOT serialized
                  }
                : undefined,
            }
          })

          const persisted: PersistedState = {
            tabs: serializableTabs,
            activeTabId: state.activeTabId,
            currentWorkspaceId: state.currentWorkspaceId,
          }

          localStorage.setItem(name, JSON.stringify({ state: persisted }))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
