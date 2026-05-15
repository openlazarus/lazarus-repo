import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Workspace interface matching the backend response
 */
export interface Workspace {
  id: string
  name: string
  description?: string
  type: 'user' | 'team'
  ownerId: string
  teamId?: string
  teamName?: string
  path: string
  createdAt: string
  updatedAt?: string
  avatar?: string | null
  color?: string | null
  memberCount?: number
  agentCount?: number
  needsOnboarding?: boolean
  /** Provisioning / health state of the underlying workspace VM. */
  status?: 'starting' | 'healthy' | 'unhealthy' | 'not_provisioned' | 'stopped'
  /** Public domain URL for the workspace VM. */
  domainUrl?: string
}

/**
 * Workspace Store State
 *
 * Pure state store — no API calls. Fetching is handled by use-workspace.ts hook.
 * This allows api-client.ts to import this store without circular dependencies.
 */
interface WorkspaceStore {
  // State
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  isLoading: boolean
  error: string | null
  isInitialized: boolean

  // Computed
  getActiveWorkspace: () => Workspace | null

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void
  setInitialized: (initialized: boolean) => void
  setActiveWorkspace: (workspaceId: string | null) => void
  addWorkspace: (workspace: Workspace) => void
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void
  removeWorkspace: (workspaceId: string) => void
  reset: () => void
}

/**
 * Workspace Store
 * Global state management for workspaces using Zustand
 */
export const useWorkspaceStore = create<WorkspaceStore>()(
  persist(
    (set, get) => ({
      // Initial state
      workspaces: [],
      activeWorkspaceId: null,
      isLoading: false,
      error: null,
      isInitialized: false,

      // Get active workspace
      getActiveWorkspace: () => {
        const state = get()
        if (!state.activeWorkspaceId) return null
        return (
          state.workspaces.find((ws) => ws.id === state.activeWorkspaceId) ||
          null
        )
      },

      // Set full workspace list (called by use-workspace.ts after fetch + enrichment)
      setWorkspaces: (workspaces) => {
        const currentState = get()
        const currentActiveId = currentState.activeWorkspaceId

        // Auto-select first workspace if none selected or current not in list
        let newActiveId = currentActiveId
        if (
          !currentActiveId ||
          !workspaces.find((ws) => ws.id === currentActiveId)
        ) {
          newActiveId = workspaces.length > 0 ? workspaces[0].id : null
        }

        set({
          workspaces,
          activeWorkspaceId: newActiveId,
          isLoading: false,
          error: null,
        })
      },

      // Set initialized flag
      setInitialized: (initialized) => {
        set({ isInitialized: initialized })
      },

      // Set active workspace
      setActiveWorkspace: (workspaceId) => {
        const state = get()

        if (workspaceId === null) {
          set({ activeWorkspaceId: null })
          return
        }

        const workspace = state.workspaces.find((ws) => ws.id === workspaceId)
        if (workspace) {
          set({ activeWorkspaceId: workspaceId })
        } else {
          console.warn(
            `[WorkspaceStore] Workspace ${workspaceId} not found in store`,
          )
        }
      },

      // Add a workspace to the store
      addWorkspace: (workspace) => {
        set((state) => ({
          workspaces: [...state.workspaces, workspace],
        }))
      },

      // Update a workspace in the store
      updateWorkspace: (workspaceId, updates) => {
        set((state) => ({
          workspaces: state.workspaces.map((ws) =>
            ws.id === workspaceId ? { ...ws, ...updates } : ws,
          ),
        }))
      },

      // Remove a workspace from the store
      removeWorkspace: (workspaceId) => {
        set((state) => {
          const newWorkspaces = state.workspaces.filter(
            (ws) => ws.id !== workspaceId,
          )

          // If the removed workspace was active, select another one
          let newActiveId = state.activeWorkspaceId
          if (state.activeWorkspaceId === workspaceId) {
            newActiveId = newWorkspaces.length > 0 ? newWorkspaces[0].id : null
          }

          return {
            workspaces: newWorkspaces,
            activeWorkspaceId: newActiveId,
          }
        })
      },

      // Reset store
      reset: () => {
        set({
          workspaces: [],
          activeWorkspaceId: null,
          isLoading: false,
          error: null,
          isInitialized: false,
        })
      },
    }),
    {
      name: 'lazarus:workspace-store',
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
      }),
    },
  ),
)
