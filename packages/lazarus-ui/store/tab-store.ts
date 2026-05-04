import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Chat tab interface - metadata only, no embedded state
 */
export interface ChatTab {
  id: string
  conversationId: string | null // null for unsaved new chats
  title: string
  order: number
  createdAt: Date
  lastAccessedAt: Date
  agentId?: string | null // Agent ID for this chat (null = default Lazarus agent)
  agentName?: string // Agent display name
}

/**
 * Serializable version of ChatTab for localStorage persistence
 */
interface SerializableChatTab {
  id: string
  conversationId: string | null
  title: string
  order: number
  createdAt: string
  lastAccessedAt: string
  agentId?: string | null
  agentName?: string
}

/**
 * Storage shape for persistence
 */
interface PersistedTabState {
  tabs: SerializableChatTab[]
  activeTabId: string | null
  currentWorkspaceId: string | null
}

/**
 * Tab store state
 */
interface TabStore {
  // State
  tabs: ChatTab[]
  activeTabId: string | null
  currentWorkspaceId: string | null
  _hasHydrated: boolean

  // Tab operations
  createTab: (
    conversationId?: string | null,
    agentId?: string | null,
    agentName?: string,
  ) => string
  closeTab: (tabId: string) => void
  switchTab: (tabId: string) => void
  updateTab: (tabId: string, updates: Partial<ChatTab>) => void
  linkTabToConversation: (
    tabId: string,
    conversationId: string,
    title?: string,
  ) => void

  // Queries
  getTab: (tabId: string) => ChatTab | undefined
  getActiveTab: () => ChatTab | undefined
  getTabByConversation: (conversationId: string) => ChatTab | undefined
  getTabsSortedByOrder: () => ChatTab[]

  // Bulk operations
  reorderTabs: (tabIds: string[]) => void

  // Workspace management
  setWorkspaceId: (workspaceId: string | null) => void

  // Hydration
  setHasHydrated: (hasHydrated: boolean) => void
}

/**
 * Tab store using Zustand
 * Manages tab metadata - no conversation state
 */
export const useTabStore = create<TabStore>()(
  persist(
    (set, get) => ({
      // Initial state
      tabs: [],
      activeTabId: null,
      currentWorkspaceId: null,
      _hasHydrated: false,

      // Hydration
      setHasHydrated: (hasHydrated: boolean) => {
        set({ _hasHydrated: hasHydrated })
      },

      // Tab operations
      createTab: (
        conversationId = null,
        agentId = null,
        agentName = 'Lazarus',
      ) => {
        const { tabs } = get()

        // Generate new tab ID
        const tabId = `tab_${Date.now()}_${Math.random().toString(36).substring(7)}`

        // Determine order (append to end)
        const maxOrder =
          tabs.length > 0 ? Math.max(...tabs.map((t) => t.order)) : -1

        const newTab: ChatTab = {
          id: tabId,
          conversationId,
          title: 'New Chat',
          order: maxOrder + 1,
          createdAt: new Date(),
          lastAccessedAt: new Date(),
          agentId,
          agentName,
        }

        set({
          tabs: [...tabs, newTab],
          activeTabId: tabId,
        })

        console.log(
          '[TabStore] Created tab:',
          tabId,
          'conversationId:',
          conversationId,
          'agentId:',
          agentId,
          'agentName:',
          agentName,
        )

        return tabId
      },

      closeTab: (tabId) => {
        const { tabs, activeTabId, createTab } = get()

        // Find tab index
        const tabIndex = tabs.findIndex((t) => t.id === tabId)
        if (tabIndex === -1) {
          console.warn('[TabStore] Cannot close - tab not found:', tabId)
          return
        }

        // Remove tab
        const newTabs = tabs.filter((t) => t.id !== tabId)

        // If this was the last tab, create a new empty one
        if (newTabs.length === 0) {
          console.log('[TabStore] Last tab closed, creating new empty tab')
          set({ tabs: newTabs, activeTabId: null })
          // Create new tab (this will update state with the new tab)
          createTab(null)
          return
        }

        // Determine new active tab if closing active tab
        let newActiveTabId = activeTabId

        if (activeTabId === tabId) {
          if (tabIndex > 0) {
            // Switch to previous tab
            newActiveTabId = newTabs[tabIndex - 1].id
          } else {
            // Switch to next tab (now at index 0)
            newActiveTabId = newTabs[0].id
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })

        console.log(
          '[TabStore] Closed tab:',
          tabId,
          'new active:',
          newActiveTabId,
        )
      },

      switchTab: (tabId) => {
        const { tabs } = get()

        const tab = tabs.find((t) => t.id === tabId)
        if (!tab) {
          console.warn('[TabStore] Cannot switch - tab not found:', tabId)
          return
        }

        // Update last accessed time
        const updatedTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, lastAccessedAt: new Date() } : t,
        )

        set({
          tabs: updatedTabs,
          activeTabId: tabId,
        })

        console.log('[TabStore] Switched to tab:', tabId)
      },

      updateTab: (tabId, updates) => {
        const { tabs } = get()

        const tabIndex = tabs.findIndex((t) => t.id === tabId)
        if (tabIndex === -1) {
          console.warn('[TabStore] Cannot update - tab not found:', tabId)
          return
        }

        const updatedTabs = tabs.map((t) =>
          t.id === tabId ? { ...t, ...updates } : t,
        )

        set({ tabs: updatedTabs })

        console.log('[TabStore] Updated tab:', tabId, updates)
      },

      linkTabToConversation: (tabId, conversationId, title) => {
        const { tabs } = get()

        const tab = tabs.find((t) => t.id === tabId)
        if (!tab) {
          console.warn('[TabStore] Cannot link - tab not found:', tabId)
          return
        }

        const updates: Partial<ChatTab> = {
          conversationId,
        }

        if (title) {
          updates.title = title
        }

        get().updateTab(tabId, updates)

        console.log(
          '[TabStore] Linked tab',
          tabId,
          'to conversation:',
          conversationId,
        )
      },

      // Queries
      getTab: (tabId) => {
        return get().tabs.find((t) => t.id === tabId)
      },

      getActiveTab: () => {
        const { tabs, activeTabId } = get()
        if (!activeTabId) return undefined
        return tabs.find((t) => t.id === activeTabId)
      },

      getTabByConversation: (conversationId) => {
        return get().tabs.find((t) => t.conversationId === conversationId)
      },

      getTabsSortedByOrder: () => {
        return [...get().tabs].sort((a, b) => a.order - b.order)
      },

      // Bulk operations
      reorderTabs: (tabIds) => {
        const { tabs } = get()

        // Create map of new orders
        const orderMap = new Map(tabIds.map((id, index) => [id, index]))

        // Update tab orders
        const updatedTabs = tabs.map((tab) => ({
          ...tab,
          order: orderMap.get(tab.id) ?? tab.order,
        }))

        set({ tabs: updatedTabs })

        console.log('[TabStore] Reordered tabs:', tabIds)
      },

      // Workspace management - saves/loads tabs per workspace
      setWorkspaceId: (workspaceId) => {
        const state = get()
        const oldWorkspaceId = state.currentWorkspaceId

        // If workspace hasn't changed, do nothing
        if (oldWorkspaceId === workspaceId) return

        console.log('[TabStore] Switching workspace:', {
          from: oldWorkspaceId,
          to: workspaceId,
          currentTabCount: state.tabs.length,
        })

        // Special case: If tabs were already loaded from rehydration with this workspace,
        // we only need to ensure the workspace ID is set, not reload tabs
        if (oldWorkspaceId === null && workspaceId && state.tabs.length > 0) {
          console.log(
            '[TabStore] Workspace set after rehydration, keeping existing tabs',
          )
          set({ currentWorkspaceId: workspaceId })
          return
        }

        // Save current tabs to old workspace's storage
        if (oldWorkspaceId) {
          const storageKey = `lazarus:chat-tabs:${oldWorkspaceId}`
          const serializableTabs: SerializableChatTab[] = state.tabs.map(
            (tab) => ({
              id: tab.id,
              conversationId: tab.conversationId,
              title: tab.title,
              order: tab.order,
              createdAt: tab.createdAt.toISOString(),
              lastAccessedAt: tab.lastAccessedAt.toISOString(),
              agentId: tab.agentId,
              agentName: tab.agentName,
            }),
          )

          const persisted: PersistedTabState = {
            tabs: serializableTabs,
            activeTabId: state.activeTabId,
            currentWorkspaceId: oldWorkspaceId,
          }

          localStorage.setItem(storageKey, JSON.stringify(persisted))
          console.log(
            `[TabStore] Saved ${state.tabs.length} chat tabs to ${storageKey}`,
          )
        }

        // Load tabs from new workspace's storage
        if (workspaceId) {
          const storageKey = `lazarus:chat-tabs:${workspaceId}`
          const stored = localStorage.getItem(storageKey)

          if (stored) {
            try {
              const persisted: PersistedTabState = JSON.parse(stored)
              const tabs: ChatTab[] = persisted.tabs.map((tab) => ({
                ...tab,
                createdAt: new Date(tab.createdAt),
                lastAccessedAt: new Date(tab.lastAccessedAt),
              }))

              console.log(
                `[TabStore] Loaded ${tabs.length} chat tabs from ${storageKey}`,
              )

              // If loaded tabs are empty, create a default tab
              if (tabs.length === 0) {
                console.log(
                  `[TabStore] Loaded empty tabs for workspace ${workspaceId}, creating default tab`,
                )
                set({
                  tabs: [],
                  activeTabId: null,
                  currentWorkspaceId: workspaceId,
                })
                // Create default tab after setting workspace
                get().createTab(null)
              } else {
                set({
                  tabs,
                  activeTabId: persisted.activeTabId,
                  currentWorkspaceId: workspaceId,
                })
              }
            } catch (error) {
              console.error(
                `[TabStore] Error loading chat tabs for workspace ${workspaceId}:`,
                error,
              )
              set({
                tabs: [],
                activeTabId: null,
                currentWorkspaceId: workspaceId,
              })
              // Create default tab on error
              get().createTab(null)
            }
          } else {
            // No stored tabs for this workspace, create a default tab
            console.log(
              `[TabStore] No stored chat tabs for workspace ${workspaceId}, creating default tab`,
            )
            set({
              tabs: [],
              activeTabId: null,
              currentWorkspaceId: workspaceId,
            })
            // Create default tab
            get().createTab(null)
          }
        } else {
          // No workspace selected - but don't clear tabs if we have some from rehydration
          // This preserves tabs during the initial loading phase
          const state = get()
          if (state.tabs.length > 0) {
            console.log(
              '[TabStore] No workspace provided, but keeping existing tabs',
            )
            // Just clear the workspace ID, keep the tabs
            set({ currentWorkspaceId: null })
          } else {
            console.log('[TabStore] No workspace and no tabs')
            set({
              tabs: [],
              activeTabId: null,
              currentWorkspaceId: null,
            })
          }
        }
      },
    }),
    {
      name: 'lazarus:chat-tabs',
      onRehydrateStorage: () => (state) => {
        // Called when rehydration is complete
        console.log(
          '[TabStore] Rehydration complete, tabs:',
          state?.tabs?.length || 0,
        )
        state?.setHasHydrated(true)
      },
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          console.log(
            '[TabStore] getItem called, raw storage:',
            str?.substring(0, 200),
          )

          if (!str) {
            console.log('[TabStore] No stored data found')
            return null
          }

          try {
            const parsed = JSON.parse(str)
            // Handle both old format (direct state) and new format (wrapped in state object)
            const persisted: Partial<PersistedTabState> = parsed.state || parsed

            console.log('[TabStore] Parsed storage:', {
              hasState: !!parsed.state,
              tabCount: persisted.tabs?.length || 0,
              activeTabId: persisted.activeTabId,
              currentWorkspaceId: persisted.currentWorkspaceId,
            })

            // If we have a stored workspaceId, load from workspace-specific storage instead
            const storedWorkspaceId = persisted.currentWorkspaceId
            if (storedWorkspaceId) {
              const workspaceStorageKey = `lazarus:chat-tabs:${storedWorkspaceId}`
              const workspaceStr = localStorage.getItem(workspaceStorageKey)
              console.log(
                '[TabStore] Checking workspace storage:',
                workspaceStorageKey,
                'exists:',
                !!workspaceStr,
              )

              if (workspaceStr) {
                try {
                  const workspaceParsed = JSON.parse(workspaceStr)
                  // Handle both formats for workspace storage too
                  const workspacePersisted: Partial<PersistedTabState> =
                    workspaceParsed.state || workspaceParsed

                  const tabs: ChatTab[] = (workspacePersisted.tabs || []).map(
                    (tab) => ({
                      ...tab,
                      createdAt: new Date(tab.createdAt),
                      lastAccessedAt: new Date(tab.lastAccessedAt),
                    }),
                  )

                  console.log(
                    `[TabStore] Rehydrating ${tabs.length} tabs for workspace ${storedWorkspaceId}`,
                  )

                  return {
                    state: {
                      tabs,
                      activeTabId: workspacePersisted.activeTabId || null,
                      currentWorkspaceId: storedWorkspaceId,
                    },
                  }
                } catch (workspaceError) {
                  console.error(
                    '[TabStore] Error parsing workspace tabs:',
                    workspaceError,
                  )
                }
              }
            }

            // If we had a storedWorkspaceId but couldn't find workspace-specific storage,
            // the default storage tabs are from a different workspace — don't load them
            if (storedWorkspaceId) {
              console.log(
                `[TabStore] Workspace-specific storage not found for ${storedWorkspaceId}, starting fresh`,
              )
              return {
                state: {
                  tabs: [],
                  activeTabId: null,
                  currentWorkspaceId: storedWorkspaceId,
                },
              }
            }

            // No workspace context at all — load from default storage (legacy/first-time)
            const tabs: ChatTab[] = (persisted.tabs || []).map((tab) => ({
              ...tab,
              createdAt: new Date(tab.createdAt),
              lastAccessedAt: new Date(tab.lastAccessedAt),
            }))

            console.log(
              `[TabStore] Rehydrating ${tabs.length} tabs from default storage (no workspace context)`,
            )

            return {
              state: {
                tabs,
                activeTabId: persisted.activeTabId || null,
                currentWorkspaceId: null,
              },
            }
          } catch (error) {
            console.error('[TabStore] Error parsing stored tabs:', error)
            return null
          }
        },
        setItem: (name, value) => {
          const state = value.state as {
            tabs: ChatTab[]
            activeTabId: string | null
            currentWorkspaceId: string | null
          }

          // Convert tabs to serializable format
          const serializableTabs: SerializableChatTab[] = state.tabs.map(
            (tab) => ({
              id: tab.id,
              conversationId: tab.conversationId,
              title: tab.title,
              order: tab.order,
              createdAt: tab.createdAt.toISOString(),
              lastAccessedAt: tab.lastAccessedAt.toISOString(),
              agentId: tab.agentId,
              agentName: tab.agentName,
            }),
          )

          const persisted: PersistedTabState = {
            tabs: serializableTabs,
            activeTabId: state.activeTabId,
            currentWorkspaceId: state.currentWorkspaceId,
          }

          // Always save to both default storage (for workspace tracking) and workspace-specific storage
          localStorage.setItem(name, JSON.stringify({ state: persisted }))

          // Also save to workspace-specific storage if we have a workspace
          if (state.currentWorkspaceId) {
            const workspaceStorageKey = `lazarus:chat-tabs:${state.currentWorkspaceId}`
            const workspacePersisted: PersistedTabState = {
              tabs: serializableTabs,
              activeTabId: state.activeTabId,
              currentWorkspaceId: state.currentWorkspaceId,
            }
            localStorage.setItem(
              workspaceStorageKey,
              JSON.stringify(workspacePersisted),
            )
          }
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
