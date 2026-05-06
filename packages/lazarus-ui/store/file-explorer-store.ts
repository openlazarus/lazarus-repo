import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { WorkspaceFile } from '@/hooks/features/workspace/types'

/**
 * Sort options for file tree
 */
export type SortOption =
  | 'name-folders-first'
  | 'name-asc'
  | 'name-desc'
  | 'date-desc'
  | 'date-asc'
  | 'size-desc'
  | 'size-asc'
  | 'type'

/**
 * File explorer state
 */
interface FileExplorerState {
  // Expansion state - persisted
  expandedFolders: Set<string>

  // Loading state - not persisted
  loadingFiles: Set<string>

  // Cached files - not persisted (fetched from server)
  workspaceFiles: Map<string, WorkspaceFile[]>

  // User preferences - persisted
  showHiddenFiles: boolean
  sortBy: SortOption

  // Actions
  toggleFolder: (folderId: string) => void
  expandFolder: (folderId: string) => void
  collapseFolder: (folderId: string) => void
  setLoading: (folderId: string, isLoading: boolean) => void
  setFiles: (folderId: string, files: WorkspaceFile[]) => void
  clearFiles: (workspaceId?: string) => void
  setShowHiddenFiles: (show: boolean) => void
  setSortBy: (sortBy: SortOption) => void

  // Selectors (for direct access without hooks)
  isExpanded: (folderId: string) => boolean
  isLoading: (folderId: string) => boolean
  getFiles: (folderId: string) => WorkspaceFile[]
}

/**
 * File explorer Zustand store with persistence
 */
export const useFileExplorerStore = create<FileExplorerState>()(
  persist(
    (set, get) => ({
      // Initial state
      expandedFolders: new Set<string>(),
      loadingFiles: new Set<string>(),
      workspaceFiles: new Map<string, WorkspaceFile[]>(),
      showHiddenFiles: false,
      sortBy: 'name-folders-first',

      // Toggle folder expansion
      toggleFolder: (folderId) => {
        set((state) => {
          const next = new Set(state.expandedFolders)
          if (next.has(folderId)) {
            next.delete(folderId)
          } else {
            next.add(folderId)
          }
          return { expandedFolders: next }
        })
      },

      // Expand a folder
      expandFolder: (folderId) => {
        set((state) => {
          if (state.expandedFolders.has(folderId)) return state
          const next = new Set(state.expandedFolders)
          next.add(folderId)
          return { expandedFolders: next }
        })
      },

      // Collapse a folder
      collapseFolder: (folderId) => {
        set((state) => {
          if (!state.expandedFolders.has(folderId)) return state
          const next = new Set(state.expandedFolders)
          next.delete(folderId)
          return { expandedFolders: next }
        })
      },

      // Set loading state for a folder
      setLoading: (folderId, isLoading) => {
        set((state) => {
          const next = new Set(state.loadingFiles)
          if (isLoading) {
            next.add(folderId)
          } else {
            next.delete(folderId)
          }
          return { loadingFiles: next }
        })
      },

      // Set files for a folder
      setFiles: (folderId, files) => {
        set((state) => {
          const next = new Map(state.workspaceFiles)
          next.set(folderId, files)
          return { workspaceFiles: next }
        })
      },

      // Clear cached files (optionally for a specific workspace)
      clearFiles: (workspaceId) => {
        set((state) => {
          if (!workspaceId) {
            return { workspaceFiles: new Map() }
          }
          const next = new Map(state.workspaceFiles)
          // Remove all entries that start with the workspace ID
          for (const key of next.keys()) {
            if (key.startsWith(`${workspaceId}:`)) {
              next.delete(key)
            }
          }
          return { workspaceFiles: next }
        })
      },

      // Set show hidden files preference
      setShowHiddenFiles: (show) => {
        set({ showHiddenFiles: show })
      },

      // Set sort option
      setSortBy: (sortBy) => {
        set({ sortBy })
      },

      // Selector: check if folder is expanded
      isExpanded: (folderId) => {
        return get().expandedFolders.has(folderId)
      },

      // Selector: check if folder is loading
      isLoading: (folderId) => {
        return get().loadingFiles.has(folderId)
      },

      // Selector: get files for a folder
      getFiles: (folderId) => {
        return get().workspaceFiles.get(folderId) || []
      },
    }),
    {
      name: 'file-explorer-storage',
      // Only persist user preferences and expansion state
      partialize: (state) => ({
        expandedFolders: state.expandedFolders,
        showHiddenFiles: state.showHiddenFiles,
        sortBy: state.sortBy,
      }),
      // Custom serialization for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name)
          if (!str) return null
          const parsed = JSON.parse(str)
          return {
            ...parsed,
            state: {
              ...parsed.state,
              expandedFolders: new Set(parsed.state.expandedFolders || []),
              // Initialize non-persisted state
              loadingFiles: new Set<string>(),
              workspaceFiles: new Map<string, WorkspaceFile[]>(),
            },
          }
        },
        setItem: (name, value) => {
          const toStore = {
            ...value,
            state: {
              ...value.state,
              expandedFolders: Array.from(value.state.expandedFolders || []),
            },
          }
          localStorage.setItem(name, JSON.stringify(toStore))
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    },
  ),
)
